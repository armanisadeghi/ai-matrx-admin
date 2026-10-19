/** @jest-environment node */
// The whole start-a-payment path (startCheckout) on a fake database and a fake Stripe:
//  PAYMENTS-FINAL  a portal whose client can edit the amount field is refused at CHARGE time (the DB refuses
//                  it at save time: pnpm check:payment-settle-rules M3p); read-only, the same ask charges.
//  REVIEW-PAYMENTS-2 I2  a pending payment whose Stripe session can no longer be read (connected account
//                  deleted, 404 at the session read) is settled expired and a NEW session opens; any other
//                  Stripe failure still stops the start (never opens a second live session).

jest.mock("server-only", () => ({}));

const stripe = {
  checkout: {
    sessions: {
      retrieve: jest.fn(),
      create: jest.fn(async () => ({ id: "cs_new", url: "https://checkout.stripe.com/c/cs_new" })),
      expire: jest.fn(),
    },
  },
};
jest.mock("@/lib/stripe/server", () => ({ getStripe: () => stripe, requiredStripeMode: () => "test" }));

interface Call { schema: string; table: string; op: string; payload?: unknown; filters: unknown[][] }
const calls: Call[] = [];
const rpcs: { schema: string; fn: string; args: unknown }[] = [];
let portalHits: { portal_id: string }[] = [];
let paymentRows: unknown[] = [];

function answer(q: Call): { data: unknown; error: null } {
  const key = `${q.schema}.${q.table}`;
  if (q.op === "insert") return { data: { id: "pay_new" }, error: null };
  if (q.op === "update") return { data: null, error: null };
  switch (key) {
    case "billing.org_payment_account":
      return { data: { organization_id: "org1", stripe_account_id: "acct_A", livemode: false, charges_enabled: true, payouts_enabled: true, details_submitted: true, disconnected_at: null }, error: null };
    case "custom.record":
      return { data: { table_id: "tbl1", data: { value: "25" } }, error: null };
    case "custom.anon_form":
      return { data: { exposed_field_keys: [] }, error: null };
    case "custom.portal_table":
      return { data: portalHits, error: null };
    case "custom.portal":
      return { data: portalHits.map((h) => ({ id: h.portal_id })), error: null };
    case "billing.payment":
      return { data: paymentRows, error: null };
    default:
      throw new Error(`unexpected read ${key}`);
  }
}

function from(schema: string, table: string) {
  const q: Call = { schema, table, op: "select", filters: [] };
  calls.push(q);
  const api: Record<string, unknown> = {};
  const filter = (name: string) => (...args: unknown[]) => { q.filters.push([name, ...args]); return api; };
  Object.assign(api, {
    select: () => api,
    eq: filter("eq"), is: filter("is"), in: filter("in"), contains: filter("contains"), order: filter("order"),
    insert: (payload: unknown) => { q.op = "insert"; q.payload = payload; return api; },
    update: (payload: unknown) => { q.op = "update"; q.payload = payload; return api; },
    maybeSingle: async () => answer(q),
    single: async () => answer(q),
    then: (ok: (v: unknown) => unknown, bad: (e: unknown) => unknown) => Promise.resolve().then(() => answer(q)).then(ok, bad),
  });
  return api;
}

jest.mock("@/utils/supabase/adminClient", () => ({
  createAdminClient: () => ({
    schema: (schema: string) => ({
      from: (table: string) => from(schema, table),
      rpc: async (fn: string, args: unknown) => {
        rpcs.push({ schema, fn, args });
        return { data: fn === "knob_resolve" ? 1000000 : { settled: true }, error: null };
      },
    }),
  }),
}));

import { PaymentRefusal, startCheckout } from "@/features/payments/server";
import type { PaymentAsk } from "@/features/payments/amount";

const ask = (over: Partial<PaymentAsk>): PaymentAsk => ({
  id: "ask1", organization_id: "org1", subject_kind: "table", subject_id: "tbl1", table_id: "tbl1", enabled: true,
  amount_mode: "fixed", amount_cents: 2500, amount_field: null, currency: "usd", description: "Invoice", status_field_key: "payment",
  ...over,
});
const start = (a: PaymentAsk) => startCheckout({ ask: a, recordId: "rec1", origin: "https://example.test", back: "/portal/c/x/r/rec1" });
const inserts = () => calls.filter((c) => c.op === "insert");

beforeEach(() => {
  calls.length = 0;
  rpcs.length = 0;
  portalHits = [];
  paymentRows = [];
  jest.clearAllMocks();
});

describe("a portal client never sets her own price (PAYMENTS-FINAL)", () => {
  const fieldAsk = ask({ amount_mode: "field", amount_cents: null, amount_field: "value" });

  it("refuses at charge time when an open portal lets the client edit the amount field", async () => {
    portalHits = [{ portal_id: "portal1" }];
    await expect(start(fieldAsk)).rejects.toThrow(PaymentRefusal);
    await expect(start(fieldAsk)).rejects.toThrow(/portal lets the payer change the amount/);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    expect(inserts()).toHaveLength(0);
  });

  it("charges the stored amount when the field is read-only on every portal", async () => {
    const started = await start(fieldAsk);
    expect(started.amountCents).toBe(2500);
    expect(stripe.checkout.sessions.create).toHaveBeenCalledTimes(1);
    const portalRead = calls.find((c) => c.table === "portal_table");
    expect(portalRead?.filters).toEqual(expect.arrayContaining([["eq", "table_id", "tbl1"], ["contains", "editable_field_keys", JSON.stringify(["value"])]]));
  });

  it("a fixed amount never asks the portals", async () => {
    portalHits = [{ portal_id: "portal1" }];
    await start(ask({}));
    expect(calls.some((c) => c.table === "portal_table")).toBe(false);
  });
});

describe("a pending session Stripe can no longer read never blocks the record (REVIEW-PAYMENTS-2 I2)", () => {
  const pendingOld = { id: "pay_old", status: "pending", amount_cents: 2500, currency: "usd", stripe_account_id: "acct_gone", stripe_checkout_session_id: "cs_old", created_at: "2026-10-18T00:00:00Z" };

  it("404 at the session read: the old row is settled expired, then a new session opens", async () => {
    paymentRows = [pendingOld];
    stripe.checkout.sessions.retrieve.mockRejectedValueOnce(Object.assign(new Error("No such checkout.session: cs_old"), { statusCode: 404, code: "resource_missing", type: "StripeInvalidRequestError" }));
    const started = await start(ask({}));
    expect(stripe.checkout.sessions.retrieve).toHaveBeenCalledWith("cs_old", {}, { stripeAccount: "acct_gone" });
    const settleOld = rpcs.findIndex((r) => r.fn === "payment_settle" && (r.args as { p_checkout_session_id: string; p_status: string }).p_checkout_session_id === "cs_old");
    expect(settleOld).toBeGreaterThanOrEqual(0);
    expect((rpcs[settleOld].args as { p_status: string }).p_status).toBe("expired");
    expect(inserts()).toHaveLength(1);
    expect(stripe.checkout.sessions.create).toHaveBeenCalledTimes(1);
    expect(started).toEqual(expect.objectContaining({ paymentId: "pay_new", url: "https://checkout.stripe.com/c/cs_new" }));
  });

  it("any other Stripe failure stops the start: no new row, no second session", async () => {
    paymentRows = [pendingOld];
    stripe.checkout.sessions.retrieve.mockRejectedValueOnce(Object.assign(new Error("Stripe is down"), { statusCode: 500, type: "StripeAPIError" }));
    await expect(start(ask({}))).rejects.toThrow("Stripe is down");
    expect(inserts()).toHaveLength(0);
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    expect(rpcs.some((r) => r.fn === "payment_settle")).toBe(false);
  });
});
