import "server-only";

// features/payments/notice.ts — the server's answer to "what does this page say about payment?"
// for the form and booking pages (REVIEW-PAYMENTS I4/I5/I7). The query only says WHICH payment
// (`pid`) or record (`rec`) to read; every word shown comes from the payment row or a fresh check.

import { checkoutRefusal, verifiedReturn } from "./server";
import type { PaymentNoticeProps } from "./PaymentNotice";
import { isUuidShape } from "@ai-matrx/kit/uuid";

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export async function paymentNoticeFor(
  subjectId: string,
  query: Record<string, string | string[] | undefined>,
  back: string,
): Promise<PaymentNoticeProps | null> {
  const word = one(query.payment);
  if (!word) return null;
  try {
    if (word === "refused") {
      const rec = one(query.rec);
      if (!rec || !isUuidShape(rec)) return { outcome: "refused", reason: "Try again later." };
      const reason = await checkoutRefusal("form", subjectId, rec);
      if (reason === "This is already paid.") return { outcome: "paid" };
      return { outcome: "refused", reason, retry: { subjectId, recordId: rec, back } };
    }
    const seen = await verifiedReturn(subjectId, one(query.pid));
    if (!seen) return null;
    const retry = { subjectId, recordId: seen.recordId, back };
    if (seen.status === "paid") return { outcome: "paid" };
    if (seen.status === "refunded") return { outcome: "refunded" };
    if (seen.status === "pending" && word === "open") return { outcome: "open" };
    return { outcome: "cancelled", retry };
  } catch (thrown) {
    console.error("[payments/notice]", thrown instanceof Error ? thrown.message : thrown);
    return null;
  }
}
