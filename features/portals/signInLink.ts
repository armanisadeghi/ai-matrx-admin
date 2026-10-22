import "server-only";

// features/portals/signInLink.ts — MINT AND MAIL ONE PORTAL CLIENT'S SIGN-IN LINK (moved out of the sign-in route so the
// self sign-up route, CD-PAGE-12, sends exactly the same link the same way). Every rule in the sign-in route's header
// holds here: the answer is the same sentence for invited and not invited, the link and its token are never logged,
// returned or stored, and the grant (the principal bound to the auth user) is written before the link is sent.

import { NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/client";
import { portalInvitation, portalPrincipalBind, type PortalPublic } from "@/features/portals/service";
import { createAdminClient } from "@/utils/supabase/adminClient";

/** The ONE sentence. It is the answer for invited, not invited, and already bound. */
const SAME_ANSWER = "If that address is on this portal, a sign-in link is on its way.";

function sameAnswer() {
  return NextResponse.json({ ok: true, message: SAME_ANSWER });
}

function emailBody(portalTitle: string, organization: string, link: string) {
  const subject = `Sign in to ${portalTitle}`;
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0f172a">
      <h2 style="margin:0 0 12px">${portalTitle}</h2>
      <p style="margin:0 0 20px;color:#475569">${organization} uses this portal to share your jobs and invoices with you. Use the button below to sign in. The link is single-use and expires shortly.</p>
      <a href="${link}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Open my portal</a>
      <p style="margin:20px 0 0;color:#94a3b8;font-size:12px">If you didn't ask for this, you can ignore this email.</p>
    </div>`;
  return { subject, html };
}

/**
 * OUR SIDE BROKE AFTER THE ADDRESS WAS FOUND ON THE PORTAL (the bind refused, or the mail did not
 * go). Saying "a link is on its way" then is a lie the person waits on forever, so it says so. It
 * is reachable only for an address that is on the portal, and only when something of ours failed,
 * so it is not an address oracle a stranger can drive.
 */
function failedAnswer() {
  return NextResponse.json(
    { ok: false, message: "We could not send your sign-in link just now. Try again in a minute, or ask the business to resend your invitation." },
    { status: 502 },
  );
}

/** Mint the address's single-use link to this portal and mail it; the one sentence either way. */
export async function mailPortalSignInLink(origin: string, portal: PortalPublic, email: string): Promise<NextResponse> {
  const invitation = await portalInvitation(portal.slug, email);
  if (!invitation) return sameAnswer();

  const admin = createAdminClient();

  // The invited address may have no auth user yet — this is the first time
  // anybody clicked. `generateLink` needs one, so make it first, already
  // confirmed: the magic link itself is the proof of the address.
  let userId: string | null = null;
  let hashedToken: string | null = null;

  const first = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (first.error) {
    const created = await admin.auth.admin.createUser({ email, email_confirm: true });
    if (created.error || !created.data?.user?.id) {
      // NOTHING FAILS SILENTLY — but the person still gets the same sentence,
      // because the alternative is telling a stranger that this address IS on
      // the portal and only our side broke. The operator sees it in the logs.
      console.error("portal sign-in: could not create the auth user for an invited address", {
        slug: portal.slug,
        reason: created.error?.message ?? "no user returned",
      });
      return failedAnswer();
    }
    userId = created.data.user.id;
    const second = await admin.auth.admin.generateLink({ type: "magiclink", email });
    if (second.error || !second.data?.properties?.hashed_token) {
      console.error("portal sign-in: could not mint a link for an invited address", {
        slug: portal.slug,
        reason: second.error?.message ?? "no hashed_token returned",
      });
      return failedAnswer();
    }
    hashedToken = second.data.properties.hashed_token;
    userId = second.data.user?.id ?? userId;
  } else {
    if (!first.data?.properties?.hashed_token || !first.data?.user?.id) {
      console.error("portal sign-in: generateLink answered without a token or a user", {
        slug: portal.slug,
      });
      return failedAnswer();
    }
    hashedToken = first.data.properties.hashed_token;
    userId = first.data.user.id;
  }

  // THE GRANT IS WRITTEN BEFORE THE LINK IS SENT. If the bind failed and the
  // email went anyway, she would sign in successfully and land on a portal that
  // says she is not a principal of it — the one screen this product must never
  // show to an invited person.
  try {
    await portalPrincipalBind({
      organizationId: invitation.organization_id,
      principalId: invitation.principal_id,
      userId,
    });
  } catch (error) {
    console.error("portal sign-in: custom.portal_principal_bind refused", {
      slug: portal.slug,
      reason: error instanceof Error ? error.message : "unknown",
    });
    return failedAnswer();
  }

  const destination = `/portal/c/${encodeURIComponent(portal.slug)}`;
  const link =
    `${origin}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}` +
    `&type=magiclink&redirectTo=${encodeURIComponent(destination)}`;

  const { subject, html } = emailBody(portal.title, portal.organization, link);
  const sent = await sendEmail({ to: email, subject, html });
  if (!sent.success) {
    // Announce it where an operator can act; never to the caller, and never
    // with the link in the message.
    console.error("portal sign-in: the mailer refused an invited address", {
      slug: portal.slug,
      reason: sent.error instanceof Error ? sent.error.message : "unknown",
    });
    return failedAnswer();
  }

  return sameAnswer();
}
