// app/api/payments/retry/route.ts — "Pay again" / "Pay now" on a form or booking page
// (REVIEW-PAYMENTS I5/I7). A plain form POST (works without JavaScript): subject = the form or
// booking page id, record = the saved answer/booking. The server re-reads the ask and the record and
// opens (or hands back the still-open) Stripe Checkout on the business's own account — startCheckout
// never takes an amount from here. A refusal goes back to the page, which asks the server why.

import { NextRequest, NextResponse } from "next/server";
import { isUuidShape } from "@ai-matrx/kit/uuid";
import { PaymentRefusal, readAsk, startCheckout } from "@/features/payments/server";
import { safeReturnPath } from "@/features/payments/amount";
import { requestHostOrigin } from "@/utils/auth/request-origin";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // A POST that is not a form (no body, JSON, a bot) is refused back to the page like any bad ask,
  // never a 500 — formData() throws on any other content type.
  const form = await request.formData().catch(() => new FormData());
  const subject = String(form.get("subject") ?? "");
  const record = String(form.get("record") ?? "");
  const origin = requestHostOrigin(request.headers) ?? request.nextUrl.origin;
  const back = safeReturnPath(String(form.get("back") ?? "/"), origin);
  const refused = () => {
    const url = new URL(back, origin);
    url.searchParams.set("payment", "refused");
    if (isUuidShape(record)) url.searchParams.set("rec", record);
    return NextResponse.redirect(url, 303);
  };
  if (!isUuidShape(subject) || !isUuidShape(record)) return refused();
  try {
    const ask = await readAsk("form", subject);
    if (!ask) return refused();
    const started = await startCheckout({ ask, recordId: record, origin, back });
    return NextResponse.redirect(started.url, 303);
  } catch (thrown) {
    if (!(thrown instanceof PaymentRefusal)) console.error("[payments/retry]", thrown instanceof Error ? thrown.message : thrown);
    return refused();
  }
}
