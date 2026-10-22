// app/api/portal/[slug]/sign-up/route.ts — A VISITOR PUTS HERSELF ON A PORTAL (CD-PAGE-12).
//
// POST { name, email }. Only a portal whose owner turned sign-up on takes it (`custom.portal_self_signup`, server
// lane): a row in the portal's client table and a principal for her address. Then she is sent the same single-use
// sign-in link an invited client gets, by the same mailer, and answered the same sentence. An address already on the
// portal is not a second client; it is simply sent its link.

import { NextResponse, type NextRequest } from "next/server";

import { portalPublic, portalSelfSignup } from "@/features/portals/service";
import { mailPortalSignInLink } from "@/features/portals/signInLink";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const portal = await portalPublic(slug);
  if (!portal) return NextResponse.json({ ok: false, message: "This portal is not available." }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { email?: unknown; name?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 320) {
    return NextResponse.json({ ok: false, message: "Enter the email address you want to sign in with." }, { status: 400 });
  }
  const signed = await portalSelfSignup(portal.slug, email, name).catch((thrown: unknown) => {
    console.error("portal sign-up: custom.portal_self_signup refused", { slug: portal.slug, reason: thrown instanceof Error ? thrown.message : "unknown" });
    return { state: "failed" as const, message: "We could not put you on this portal just now. Try again in a minute." };
  });
  if (!signed) return NextResponse.json({ ok: false, message: "This portal is not available." }, { status: 404 });
  if (signed.state !== "signed_up" && signed.state !== "exists") {
    return NextResponse.json({ ok: false, message: signed.message ?? "This portal is by invitation only." }, { status: signed.state === "failed" ? 502 : 400 });
  }
  return mailPortalSignInLink(request.nextUrl.origin, portal, email);
}
