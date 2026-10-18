/** @jest-environment node */

// Arman, 2026-10-17: a business's payments go to its own Stripe account with NO platform fee.
// This walks the exact Checkout parameters the server sends and the server module's source,
// so a fee key added anywhere in the business payment path turns this red.

import fs from "node:fs";
import path from "node:path";
import {
  PLATFORM_FEE_KEYS,
  directChargeSessionParams,
  keyPaths,
  majorToCents,
  resolveAmountCents,
  settledStatusOf,
} from "../amount";

const params = directChargeSessionParams({
  amountCents: 2500,
  currency: "usd",
  description: "Consultation",
  successUrl: "https://x.test/ok",
  cancelUrl: "https://x.test/back",
  paymentId: "pay_1",
  recordId: "rec_1",
  organizationId: "org_1",
});

describe("a business payment is a direct charge with no platform fee", () => {
  it("carries no fee, transfer or on_behalf_of key at any depth", () => {
    const leafNames = keyPaths(params).map((p) => p.split(".").pop());
    for (const key of PLATFORM_FEE_KEYS) expect(leafNames).not.toContain(key);
  });

  it("charges exactly the amount asked, once", () => {
    expect(params.mode).toBe("payment");
    expect(params.line_items).toEqual([
      { quantity: 1, price_data: { currency: "usd", unit_amount: 2500, product_data: { name: "Consultation" } } },
    ]);
    expect(params.client_reference_id).toBe("pay_1");
  });

  it("the server module that talks to Stripe names no fee key", () => {
    const dir = path.join(__dirname, "..");
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
      const source = fs.readFileSync(path.join(dir, file), "utf8");
      // amount.ts declares the forbidden list itself; strip that one declaration before scanning.
      const scanned = source.replace(/export const PLATFORM_FEE_KEYS[^\n]*\n/, "");
      for (const key of PLATFORM_FEE_KEYS) expect({ file, found: scanned.includes(`${key}:`) }).toEqual({ file, found: false });
    }
  });
});

describe("what an ask charges", () => {
  it("a fixed ask charges its cents", () => {
    expect(resolveAmountCents({ amount_mode: "fixed", amount_cents: 1500, amount_field: null }, {})).toEqual({ ok: true, cents: 1500 });
  });
  it("a field ask reads major units from the record", () => {
    expect(resolveAmountCents({ amount_mode: "field", amount_cents: null, amount_field: "price" }, { price: "$1,234.50" })).toEqual({ ok: true, cents: 123450 });
    expect(resolveAmountCents({ amount_mode: "field", amount_cents: null, amount_field: "price" }, { price: 40 })).toEqual({ ok: true, cents: 4000 });
  });
  it("refuses a missing, non-number or below-minimum amount with a sentence", () => {
    expect(resolveAmountCents({ amount_mode: "field", amount_cents: null, amount_field: "price" }, {})).toMatchObject({ ok: false });
    expect(resolveAmountCents({ amount_mode: "field", amount_cents: null, amount_field: "price" }, { price: "ten" })).toMatchObject({ ok: false });
    expect(resolveAmountCents({ amount_mode: "fixed", amount_cents: 20, amount_field: null }, {})).toMatchObject({ ok: false });
  });
  it("majorToCents rounds and refuses junk", () => {
    expect(majorToCents("19.999")).toBe(2000);
    expect(majorToCents("abc")).toBeNull();
    expect(majorToCents(null)).toBeNull();
  });
});

describe("Stripe session → settled status", () => {
  it("paid only when Stripe says paid; expired only when the session expired", () => {
    expect(settledStatusOf({ status: "complete", payment_status: "paid" })).toBe("paid");
    expect(settledStatusOf({ status: "open", payment_status: "unpaid" })).toBeNull();
    expect(settledStatusOf({ status: "complete", payment_status: "unpaid" })).toBeNull();
    expect(settledStatusOf({ status: "expired", payment_status: "unpaid" })).toBe("expired");
  });
});
