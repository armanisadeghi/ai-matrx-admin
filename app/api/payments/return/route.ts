// app/api/payments/return/route.ts — where Stripe Checkout sends a payer back.
//
// Never trusts the address bar: the session is re-read from Stripe on the payment's own
// connected account and only what Stripe says is settled (billing.payment_settle — idempotent,
// forward-only, and it writes Paid into the record's Payment field). Then the payer goes back
// to the page they came from, with `?payment=paid|cancelled|open` for that page to say so.

import { NextRequest, NextResponse } from "next/server";
import { settleFromReturn } from "@/features/payments/server";
import { safeReturnPath } from "@/features/payments/amount";
import { isUuidShape } from "@ai-matrx/kit/uuid";

export const dynamic = "force-dynamic";

/** Only a path on THIS site is followed — never an outside address carried in the link (I3). */
// `pid` names the payment so the page can READ its state on the server (I4) — the `payment` word is
// only a hint about what happened in Stripe's window, never proof of money.
function backTo(request: NextRequest, outcome: string): URL {
  const path = safeReturnPath(request.nextUrl.searchParams.get("back"), request.nextUrl.origin);
  const url = new URL(path, request.nextUrl.origin);
  url.searchParams.set("payment", outcome);
  const paymentId = request.nextUrl.searchParams.get("payment") ?? "";
  if (isUuidShape(paymentId)) url.searchParams.set("pid", paymentId);
  return url;
}

export async function GET(request: NextRequest) {
  const paymentId = request.nextUrl.searchParams.get("payment") ?? "";
  const sessionId = request.nextUrl.searchParams.get("session_id") ?? "";
  if (request.nextUrl.searchParams.get("cancelled") || !isUuidShape(paymentId) || !sessionId) {
    return NextResponse.redirect(backTo(request, "cancelled"), 303);
  }
  try {
    const outcome = await settleFromReturn(paymentId, sessionId);
    return NextResponse.redirect(backTo(request, outcome), 303);
  } catch (thrown) {
    console.error("[payments/return] settle failed", thrown instanceof Error ? thrown.message : thrown);
    return NextResponse.redirect(backTo(request, "open"), 303);
  }
}
