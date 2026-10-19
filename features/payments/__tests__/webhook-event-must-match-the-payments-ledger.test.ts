/** @jest-environment node */
// REVIEW-PAYMENTS M2: a verified Connect event settles a payment only when the payment was made on
// the event's own connected account and in the event's own mode. M1: refunds go through
// billing.payment_refund with the charge's running amount_refunded (partial or full).

jest.mock("server-only", () => ({}));
jest.mock("@/lib/stripe/server", () => ({ getStripe: jest.fn(), requiredStripeMode: () => "test" }));

const rpc = jest.fn(async () => ({ data: { settled: true }, error: null }));
const row = { id: "p1", stripe_account_id: "acct_A", livemode: false };
const chain = {
  select: () => chain,
  eq: () => chain,
  is: () => chain,
  maybeSingle: async () => ({ data: row, error: null }),
};
jest.mock("@/utils/supabase/adminClient", () => ({
  createAdminClient: () => ({ schema: () => ({ from: () => chain, rpc }) }),
}));

import { refundFromEvent, settleFromEvent } from "@/features/payments/server";

beforeEach(() => rpc.mockClear());

describe("Connect events apply only to their own ledger", () => {
  it("settles when account and mode match", async () => {
    await settleFromEvent("cs_1", "paid", "pi_1", { account: "acct_A", livemode: false });
    expect(rpc).toHaveBeenCalledWith("payment_settle", expect.objectContaining({ p_checkout_session_id: "cs_1", p_status: "paid" }));
  });

  it("ignores an event from another connected account", async () => {
    await settleFromEvent("cs_1", "paid", "pi_1", { account: "acct_B", livemode: false });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("ignores an event from the other mode", async () => {
    await settleFromEvent("cs_1", "expired", null, { account: "acct_A", livemode: true });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("a refund passes the running refunded amount to payment_refund", async () => {
    await refundFromEvent("pi_1", 1000, { account: "acct_A", livemode: false });
    expect(rpc).toHaveBeenCalledWith("payment_refund", { p_payment_intent_id: "pi_1", p_amount_refunded_cents: 1000 });
  });
});

import { sessionIsGone } from "@/features/payments/server";

describe("a pending session Stripe can no longer read stops blocking a new payment (REVIEW-PAYMENTS-2 I2)", () => {
  it.each([
    [{ statusCode: 404, code: "resource_missing" }, true],
    [{ statusCode: 403, code: "account_invalid" }, true],
    [{ type: "StripePermissionError" }, true],
    [{ statusCode: 500, type: "StripeAPIError" }, false],
    [{ statusCode: 429, code: "rate_limit" }, false],
  ])("%j -> gone=%s", (err, gone) => {
    expect(sessionIsGone(err)).toBe(gone);
  });
});
