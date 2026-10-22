// app/api/forms/[formId]/response/route.ts — ANSWER AGAIN: OPEN MY ANSWERS (CD-PAGE-08).
//
// The public form page holds the respondent's answer-again secret in its URL FRAGMENT (`#answer=…`, which no server
// or log sees) and posts it here; the store (`custom.form_response_read`) answers their own answers, narrowed to the
// form's questions, or a sentence saying why not. The password's fingerprint rides beside it when the form has one.

import { NextResponse } from "next/server";

import { readFormResponse } from "@/features/forms/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  let body: { edit?: unknown; unlock?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "That request did not arrive as readable JSON." }, { status: 400 });
  }
  const edit = typeof body.edit === "string" ? body.edit : "";
  const unlock = typeof body.unlock === "string" ? body.unlock : null;
  try {
    const read = await readFormResponse(formId, edit, unlock);
    if (!read) return NextResponse.json({ ok: false, state: "not_found", message: "This form is not available." }, { status: 404 });
    return NextResponse.json({ ok: read.state === "found", ...read }, { status: read.state === "found" ? 200 : 409 });
  } catch (thrown) {
    return NextResponse.json({ ok: false, message: (thrown as Error).message }, { status: 400 });
  }
}
