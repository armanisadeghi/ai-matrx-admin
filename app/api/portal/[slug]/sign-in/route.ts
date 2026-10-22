// app/api/portal/[slug]/sign-in/route.ts — WHERE A CLIENT ASKS FOR HER LINK.
//
// POST { email } → always the SAME body, whether or not that address was
// invited. An endpoint that answered differently would be an address oracle:
// anybody could type addresses at it and learn which of a business's clients
// have a portal. `custom.portal_invitation` refuses a signed-in caller in its
// own body for exactly this reason; this route is the other half of that rule.
//
// 🚨 THE LINK AND THE TOKEN ARE NEVER LOGGED, RETURNED OR STORED. They are a
// bearer credential for somebody's account: a single line of `console.log` in a
// server log, or one field in a JSON response, is a sign-in anybody holding that
// log can perform. The link exists in this process only long enough to be handed
// to the mailer.
//
// WHY THE LINK POINTS AT `/auth/confirm` AND NOT AT SUPABASE'S OWN VERIFY URL:
// `app/auth/confirm/route.ts` already verifies `token_hash` + `type=magiclink`
// server-side and then redirects to the `redirectTo` it carries, which sets the
// session as HTTP-only cookies on our own origin. `generateLink` hands back the
// `hashed_token` precisely so an app can build that link itself, and doing so
// keeps the whole flow inside one route we own instead of the implicit-flow
// fragment hop.

import { NextResponse, type NextRequest } from "next/server";

import { portalPublic } from "@/features/portals/service";
import { mailPortalSignInLink } from "@/features/portals/signInLink";

export const dynamic = "force-dynamic";

/** Deliberately loose: the door decides who is invited, not a regex. */
function looksLikeEmail(value: unknown): value is string {
  return typeof value === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) && value.length <= 320;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  // A portal that is missing, closed, or whose organization has not opened its
  // external lane is a 404 here exactly as it is on the page — the same three
  // questions, the same one answer.
  const portal = await portalPublic(slug);
  if (!portal) {
    return NextResponse.json({ ok: false, message: "This portal is not available." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null;
  if (!looksLikeEmail(body?.email)) {
    // A malformed address is a shape problem the person can see in the field,
    // not a fact about who is invited — so this one may be specific.
    return NextResponse.json(
      { ok: false, message: "Enter the email address this portal was shared with." },
      { status: 400 },
    );
  }
  const email = body.email.trim();

  return mailPortalSignInLink(request.nextUrl.origin, portal, email);
}
