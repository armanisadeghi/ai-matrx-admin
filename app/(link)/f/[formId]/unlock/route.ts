// app/(link)/f/[formId]/unlock/route.ts — THE PASSWORD BOX OF A PROTECTED PUBLIC FORM POSTS HERE (CD-PAGE-08).
//
// The same shape as a protected view link's (`/v/<token>/unlock`): the password is checked by the store
// (`custom.form_unlock`), never here; a right one comes back as the fingerprint of the stored hash, which becomes a
// signed cookie scoped to this one form's page; a wrong one goes back to the page, which says so and names nothing.
// The page's own query (?lang=, ?embed=1, prefill) rides through the box so the visitor lands where they were.

import { NextResponse } from "next/server";

import { formUnlock } from "@/features/forms/service";
import { formUnlockCookieName, makeUnlockCookieValue, UNLOCK_SECONDS } from "@/features/sharing/public-view/unlock";
import { isUuidShape } from "@ai-matrx/kit/uuid";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  const form = await request.formData();
  const kept = new URLSearchParams(typeof form.get("query") === "string" ? String(form.get("query")) : "");
  kept.delete("wrong");
  const back = (wrong: boolean) => {
    const q = new URLSearchParams(kept);
    if (wrong) q.set("wrong", "1");
    const s = q.toString();
    return new NextResponse(null, { status: 303, headers: { Location: `/f/${formId}${s ? `?${s}` : ""}` } });
  };
  if (!isUuidShape(formId)) return back(false);
  const password = form.get("password");
  if (typeof password !== "string" || password === "") return back(true);
  const gate = await formUnlock(formId, password, null);
  if (gate?.state === "locked") return back(true);
  if (gate?.state !== "open" || !gate.unlock) return back(false);
  const response = back(false);
  response.cookies.set(formUnlockCookieName(formId), makeUnlockCookieValue(formId, gate.unlock), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // An embedded form (?embed=1) lives inside somebody else's page: its cookie must travel in that frame.
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: `/f/${formId}`,
    maxAge: UNLOCK_SECONDS,
  });
  return response;
}
