// features/payments/PaymentNotice.tsx — what a form or booking page says about its payment, with a
// way to pay when it is not paid (REVIEW-PAYMENTS I4/I5/I7). Plain markup, no hooks: renders on the
// server (form, booking pages) and inside the form runner alike. The outcome passed in must come
// from the server's own read of the payment (verifiedReturn / checkoutRefusal) — never a query flag.

import { Button } from "@ai-matrx/design-system/controls";

export type PaymentNoticeOutcome = "paid" | "refunded" | "cancelled" | "open" | "refused";

export interface PaymentRetry {
  subjectId: string;
  recordId: string;
  back: string;
}

/** What the server read, handed to the notice (features/payments/notice.ts). */
export interface PaymentNoticeProps {
  outcome: PaymentNoticeOutcome;
  reason?: string | null;
  retry?: PaymentRetry | null;
}

const WORDS: Record<PaymentNoticeOutcome, string> = {
  paid: "Payment received. Thank you.",
  refunded: "This payment was refunded.",
  cancelled: "Payment was not completed.",
  open: "Your payment is still processing.",
  refused: "Payment could not start.",
};

export function PaymentNotice({
  outcome,
  note,
  reason,
  retry,
}: {
  outcome: PaymentNoticeOutcome;
  /** What stays true without payment ("Your answers were saved."). */
  note?: string;
  /** The server's sentence for a refusal. */
  reason?: string | null;
  retry?: PaymentRetry | null;
}) {
  const canPay = retry && (outcome === "cancelled" || outcome === "refused");
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-foreground" role="status">
      <span>
        {WORDS[outcome]}
        {reason ? ` ${reason}` : ""}
        {note && outcome !== "paid" && outcome !== "refunded" ? ` ${note}` : ""}
      </span>
      {canPay ? (
        <form method="post" action="/api/payments/retry">
          <input type="hidden" name="subject" value={retry.subjectId} />
          <input type="hidden" name="record" value={retry.recordId} />
          <input type="hidden" name="back" value={retry.back} />
          <Button type="submit" variant="primary">
            {outcome === "refused" ? "Pay now" : "Pay again"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
