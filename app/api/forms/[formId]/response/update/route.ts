// app/api/forms/[formId]/response/update/route.ts — ANSWER AGAIN: SAVE MY CHANGES (CD-PAGE-08).
//
// The same contract as the submit route, for a respondent changing their own answer: the ORIGIN and the RATE BUCKET
// come from the request this server holds, the answers are typed against the form's Fields, and the store
// (`custom.form_response_update`) judges the keys, the required answers and the score and changes the record the
// answer became. Its sentences are carried back whole.

import { NextResponse } from "next/server";

import { publicForm, updateFormResponse } from "@/features/forms/service";
import { typedAnswersFor } from "@ai-matrx/records/forms";

export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  let body: { edit?: unknown; values?: Record<string, unknown> };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, message: "That change did not arrive as readable JSON, so nothing was saved." }, { status: 400 });
  }
  const form = await publicForm(formId).catch(() => null);
  if (!form) {
    return NextResponse.json({ ok: false, message: "This form is not available. The link may be wrong, or it may have been taken down." }, { status: 404 });
  }
  const values = { ...(body.values ?? {}) };
  const unlock = typeof values["_unlock"] === "string" ? values["_unlock"] : null;
  for (const reserved of ["_unlock", "_hidden", "_visit", "_time_zone", "_edit"]) delete values[reserved];
  if (form.honeypot_key) delete values[form.honeypot_key];
  const typed = typedAnswersFor(form.fields, values);
  if (typed.refusal) return NextResponse.json({ ok: false, message: typed.refusal }, { status: 400 });
  const origin = request.headers.get("origin") ?? new URL(request.url).origin;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  try {
    const outcome = await updateFormResponse({
      formId,
      edit: typeof body.edit === "string" ? body.edit : "",
      origin,
      bucket: forwarded && forwarded.length > 0 ? forwarded : origin,
      values: { ...typed.values, ...(unlock ? { _unlock: unlock } : {}) },
    });
    const saved = outcome.state === "accepted";
    return NextResponse.json({ ok: saved, state: outcome.state, message: outcome.message, record_id: outcome.record_id }, { status: saved ? 200 : 429 });
  } catch (thrown) {
    const error = thrown as Error & { hint?: string };
    return NextResponse.json({ ok: false, message: error.message, hint: error.hint ?? null }, { status: 400 });
  }
}
