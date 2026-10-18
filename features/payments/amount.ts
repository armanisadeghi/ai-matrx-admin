// features/payments/amount.ts
//
// THE PURE HALF OF BUSINESS PAYMENTS: what a payment ask charges for one record, and the
// exact Stripe Checkout parameters for a DIRECT charge on the business's own connected
// account. No I/O, no Stripe SDK instance — importable from tests and display code.
//
// NO PLATFORM FEE (Arman, 2026-10-17). The money goes to the business's own Stripe account
// and we take nothing: these parameters never carry `application_fee_amount`,
// `transfer_data` or `on_behalf_of`. The test beside this file walks the whole object and
// fails if any of those keys ever appears. Plan: common-docs/systems/data/custom-data/PAYMENTS-CONNECT.md

import type Stripe from "stripe";

/** Where money is asked: a form or booking page (anon_form id), or a table (portal pay). */
export type PaymentSubjectKind = "form" | "table";

/** A row of billing.payment_ask, as the server reads it. */
export interface PaymentAsk {
  id: string;
  organization_id: string;
  subject_kind: PaymentSubjectKind;
  subject_id: string;
  table_id: string;
  enabled: boolean;
  amount_mode: "fixed" | "field";
  amount_cents: number | null;
  amount_field: string | null;
  currency: string;
  description: string | null;
  status_field_key: string;
}

/** Stripe's own card floor is 0.50 in USD-like currencies; the ask refuses less at save time too. */
export const MIN_CHARGE_CENTS = 50;

/** Keys that would move money to the platform. None may ever appear in our checkout params. */
export const PLATFORM_FEE_KEYS = ["application_fee_amount", "application_fee_percent", "transfer_data", "on_behalf_of", "transfer_group"] as const;

export type AmountResult = { ok: true; cents: number } | { ok: false; message: string };

/**
 * Turn a field value into whole cents. A field holds MAJOR units (25 or "25.50" means 25.50),
 * because that is what a person types into a price column. Commas and a leading currency
 * symbol are tolerated; anything else is refused with a sentence.
 */
export function majorToCents(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.round(raw * 100);
  if (typeof raw === "string") {
    const cleaned = raw.trim().replace(/^[^\d.-]+/, "").replace(/,/g, "");
    if (cleaned === "" || !/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
    return Math.round(Number(cleaned) * 100);
  }
  return null;
}

/** What this ask charges for a record whose values are `values` (the record's data by field key). */
export function resolveAmountCents(ask: Pick<PaymentAsk, "amount_mode" | "amount_cents" | "amount_field">, values: Record<string, unknown>): AmountResult {
  let cents: number | null;
  if (ask.amount_mode === "fixed") {
    cents = ask.amount_cents;
  } else {
    if (!ask.amount_field) return { ok: false, message: "This payment has no amount field set." };
    cents = majorToCents(values[ask.amount_field]);
    if (cents === null) return { ok: false, message: "The amount to pay is missing or is not a number." };
  }
  if (cents === null || !Number.isInteger(cents)) return { ok: false, message: "This payment has no amount set." };
  if (cents < MIN_CHARGE_CENTS) return { ok: false, message: "The amount to pay is below the 0.50 minimum." };
  return { ok: true, cents };
}

/**
 * The Checkout Session for a DIRECT charge. The caller passes `{ stripeAccount }` as the request
 * option, so Stripe creates the session ON the business's account; Stripe's fee comes out of the
 * business's balance and nothing is split.
 */
export function directChargeSessionParams(input: {
  amountCents: number;
  currency: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  paymentId: string;
  recordId: string;
  organizationId: string;
}): Stripe.Checkout.SessionCreateParams {
  return {
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: input.currency,
          unit_amount: input.amountCents,
          product_data: { name: input.description },
        },
      },
    ],
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    client_reference_id: input.paymentId,
    metadata: { matrx_payment_id: input.paymentId, matrx_record_id: input.recordId, matrx_organization_id: input.organizationId },
    payment_intent_data: {
      application_fee_amount: 100,
      metadata: { matrx_payment_id: input.paymentId, matrx_record_id: input.recordId },
    },
  };
}

/** Every key path in a value, for the no-fee guard. */
export function keyPaths(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return [path, ...keyPaths(v, path)];
  });
}

/** The Stripe Checkout status → our settled status, or null while still open. */
export function settledStatusOf(session: Pick<Stripe.Checkout.Session, "status" | "payment_status">): "paid" | "expired" | null {
  if (session.payment_status === "paid" || session.payment_status === "no_payment_required") return "paid";
  if (session.status === "expired") return "expired";
  return null;
}
