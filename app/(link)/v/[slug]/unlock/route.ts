// app/(link)/v/[slug]/unlock/route.ts — THE PASSWORD FORM OF A PROTECTED VIEW LINK POSTS HERE.
//
// A Next-only concern (a cookie). The password is checked by the store, never here: a right one comes back as `open` with an
// `unlock` fingerprint, which becomes a signed cookie scoped to this one link; a wrong one goes back to the page, which says
// so without naming anything about the view. No JavaScript is needed on the page.

import { NextResponse } from "next/server";

import { publishedView, SHARE_TOKEN_SHAPE } from "@/features/sharing/public-view/service";
import { makeUnlockCookieValue, unlockCookieName, UNLOCK_SECONDS } from "@/features/sharing/public-view/unlock";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const back = (query: string) => new NextResponse(null, { status: 303, headers: { Location: `/v/${slug}${query}` } });
  if (!SHARE_TOKEN_SHAPE.test(slug)) return back("");
  const form = await request.formData();
  const password = form.get("password");
  if (typeof password !== "string" || password === "") return back("?wrong=1");
  const view = await publishedView(slug, password);
  if (view?.state === "locked") return back("?wrong=1");
  if (view?.state !== "open" || !view.unlock) return back("");
  const response = back("");
  response.cookies.set(unlockCookieName(slug), makeUnlockCookieValue(slug, view.unlock), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: `/v/${slug}`,
    maxAge: UNLOCK_SECONDS,
  });
  return response;
}
