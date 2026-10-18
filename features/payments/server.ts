import "server-only";

// features/payments/server.ts — THE SERVER HALF OF BUSINESS PAYMENTS.
//
// A business connects its OWN Stripe account (Standard-style: full Stripe dashboard, Stripe
// collects the requirements, the account pays its own Stripe fees and carries its own losses)
// and every charge is a DIRECT charge created ON that account. We take no fee (Arman,
// 2026-10-17). Plan: common-docs/systems/data/custom-data/PAYMENTS-CONNECT.md
//
// Writes to billing.org_payment_account / billing.payment and the settle function are the
// service role's alone; members read through billing.org_payments_status / billing.payment_asks.
// The education creator payout account (billing.connect_account, Express + split) is a
// different product and is not touched here.

import type Stripe from "stripe";
import { createAdminClient } from "@/utils/supabase/adminClient";
import { getStripe, requiredStripeMode } from "@/lib/stripe/server";
import {
  directChargeSessionParams,
  resolveAmountCents,
  settledStatusOf,
  type PaymentAsk,
  type PaymentSubjectKind,
} from "./amount";

export interface OrgPaymentAccount {
  organization_id: string;
  stripe_account_id: string;
  livemode: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  disconnected_at: string | null;
}

/** The billing schema is reached with the service role only; its rows are typed here. */
function billing() {
  return createAdminClient().schema("billing");
}

export class PaymentRefusal extends Error {
  constructor(message: string, readonly status = 409) {
    super(message);
  }
}

const isLive = () => requiredStripeMode() === "live";

export async function readOrgAccount(organizationId: string): Promise<OrgPaymentAccount | null> {
  const { data, error } = await billing()
    .from("org_payment_account")
    .select("organization_id, stripe_account_id, livemode, charges_enabled, payouts_enabled, details_submitted, disconnected_at")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error) throw new Error(`billing.org_payment_account read failed: ${error.message}`);
  return (data as OrgPaymentAccount | null) ?? null;
}

function flagsOf(account: Stripe.Account) {
  return {
    charges_enabled: Boolean(account.charges_enabled),
    payouts_enabled: Boolean(account.payouts_enabled),
    details_submitted: Boolean(account.details_submitted),
    country: account.country ?? null,
    default_currency: account.default_currency ?? null,
    display_name: account.settings?.dashboard?.display_name ?? account.business_profile?.name ?? null,
    updated_at: new Date().toISOString(),
  };
}

/**
 * The organization's connected account, created on first use. A disconnected row is
 * reconnected to the SAME Stripe account (the business still owns it), never duplicated.
 * A row from the other Stripe ledger (test vs live) is replaced: a test account never
 * receives a live charge.
 */
export async function ensureOrgAccount(input: { organizationId: string; userId: string; email: string | null }): Promise<string> {
  const existing = await readOrgAccount(input.organizationId);
  if (existing && existing.livemode === isLive()) {
    if (existing.disconnected_at) {
      const { error } = await billing().from("org_payment_account")
        .update({ disconnected_at: null, connected_by: input.userId, updated_at: new Date().toISOString() })
        .eq("organization_id", input.organizationId);
      if (error) throw new Error(`Reconnecting the payment account failed: ${error.message}`);
    }
    return existing.stripe_account_id;
  }

  const account = await getStripe().accounts.create({
    email: input.email ?? undefined,
    controller: {
      stripe_dashboard: { type: "full" },
      requirement_collection: "stripe",
      fees: { payer: "account" },
      losses: { payments: "stripe" },
    },
    metadata: { matrx_organization_id: input.organizationId },
  });
  const row = {
    organization_id: input.organizationId,
    stripe_account_id: account.id,
    livemode: isLive(),
    connected_by: input.userId,
    disconnected_at: null,
    created_by: input.userId,
    ...flagsOf(account),
  };
  const { error } = existing
    ? await billing().from("org_payment_account").update(row).eq("organization_id", input.organizationId)
    : await billing().from("org_payment_account").insert(row);
  if (error) throw new Error(`Saving the payment account failed: ${error.message}`);
  return account.id;
}

/** A single-use Stripe onboarding link for the organization's account. */
export async function onboardingLink(accountId: string, returnUrl: string, refreshUrl: string): Promise<string> {
  const link = await getStripe().accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    return_url: returnUrl,
    refresh_url: refreshUrl,
  });
  return link.url;
}

/** Re-read the account from Stripe and store its flags. Null when the org has none. */
export async function refreshOrgAccount(organizationId: string): Promise<OrgPaymentAccount | null> {
  const existing = await readOrgAccount(organizationId);
  if (!existing || existing.disconnected_at) return existing;
  const account = await getStripe().accounts.retrieve(existing.stripe_account_id);
  await syncAccount(account);
  return readOrgAccount(organizationId);
}

/** account.updated (webhook) and the status route both land here. */
export async function syncAccount(account: Stripe.Account): Promise<void> {
  const { error } = await billing().from("org_payment_account").update(flagsOf(account)).eq("stripe_account_id", account.id);
  if (error) throw new Error(`Updating the payment account failed: ${error.message}`);
}

/** Stop collecting through this account. The business keeps its Stripe account and its money. */
export async function disconnectOrgAccount(organizationId: string): Promise<void> {
  const { error } = await billing().from("org_payment_account")
    .update({ disconnected_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("organization_id", organizationId);
  if (error) throw new Error(`Disconnecting failed: ${error.message}`);
}

export async function readAsk(subjectKind: PaymentSubjectKind, subjectId: string): Promise<PaymentAsk | null> {
  const { data, error } = await billing()
    .from("payment_ask")
    .select("id, organization_id, subject_kind, subject_id, table_id, enabled, amount_mode, amount_cents, amount_field, currency, description, status_field_key")
    .eq("subject_kind", subjectKind)
    .eq("subject_id", subjectId)
    .maybeSingle();
  if (error) throw new Error(`billing.payment_ask read failed: ${error.message}`);
  const ask = (data as PaymentAsk | null) ?? null;
  return ask && ask.enabled ? ask : null;
}

/** The record's own values (data by field key), read by the server. */
async function recordValues(organizationId: string, recordId: string): Promise<{ table_id: string; data: Record<string, unknown> } | null> {
  const { data, error } = await createAdminClient()
    .schema("custom")
    .from("record")
    .select("table_id, data")
    .eq("organization_id", organizationId)
    .eq("id", recordId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`Reading the record to charge failed: ${error.message}`);
  return (data as { table_id: string; data: Record<string, unknown> } | null) ?? null;
}

export interface CheckoutStarted {
  paymentId: string;
  url: string;
  amountCents: number;
  currency: string;
}

/**
 * Open a Stripe Checkout Session on the business's own account for one record. The amount is
 * computed HERE from the ask and the stored record, never taken from a browser. Marks the record
 * Unpaid. `back` is where the person returns to (paid or cancelled).
 */
export async function startCheckout(input: {
  ask: PaymentAsk;
  recordId: string;
  origin: string;
  back: string;
}): Promise<CheckoutStarted> {
  const { ask } = input;
  const account = await readOrgAccount(ask.organization_id);
  if (!account || account.disconnected_at) throw new PaymentRefusal("This organization has not connected a Stripe account yet.");
  if (account.livemode !== isLive()) throw new PaymentRefusal("The connected Stripe account is in the other mode (test vs live).");
  if (!account.charges_enabled) throw new PaymentRefusal("The connected Stripe account cannot take payments until its setup is finished.");

  const record = await recordValues(ask.organization_id, input.recordId);
  if (!record || record.table_id !== ask.table_id) throw new PaymentRefusal("That record is not one this payment is for.", 404);
  const amount = resolveAmountCents(ask, record.data);
  if (!amount.ok) throw new PaymentRefusal(amount.message, 400);

  const description = ask.description?.trim() || "Payment";
  const { data: inserted, error } = await billing().from("payment").insert({
    organization_id: ask.organization_id,
    ask_id: ask.id,
    subject_kind: ask.subject_kind,
    subject_id: ask.subject_id,
    record_id: input.recordId,
    amount_cents: amount.cents,
    currency: ask.currency,
    description,
    stripe_account_id: account.stripe_account_id,
    livemode: account.livemode,
  }).select("id").single();
  if (error || !inserted) throw new Error(`Recording the payment failed: ${error?.message ?? "no row"}`);
  const paymentId = (inserted as { id: string }).id;

  const back = encodeURIComponent(input.back);
  const session = await getStripe().checkout.sessions.create(
    directChargeSessionParams({
      amountCents: amount.cents,
      currency: ask.currency,
      description,
      successUrl: `${input.origin}/api/payments/return?payment=${paymentId}&session_id={CHECKOUT_SESSION_ID}&back=${back}`,
      cancelUrl: `${input.origin}/api/payments/return?payment=${paymentId}&cancelled=1&back=${back}`,
      paymentId,
      recordId: input.recordId,
      organizationId: ask.organization_id,
    }),
    { stripeAccount: account.stripe_account_id },
  );
  const { error: sessionError } = await billing().from("payment")
    .update({ stripe_checkout_session_id: session.id, updated_at: new Date().toISOString() })
    .eq("id", paymentId);
  if (sessionError) throw new Error(`Recording the checkout failed: ${sessionError.message}`);
  const { error: markError } = await billing().rpc("payment_mark_unpaid", { p_payment_id: paymentId });
  if (markError) throw new Error(`Marking the record unpaid failed: ${markError.message}`);
  if (!session.url) throw new Error("Stripe opened a checkout with no address.");
  return { paymentId, url: session.url, amountCents: amount.cents, currency: ask.currency };
}

/** The forms/booking door: a checkout when the subject asks for payment, otherwise null. */
export async function checkoutIfAsked(input: {
  subjectKind: PaymentSubjectKind;
  subjectId: string;
  recordId: string | null;
  origin: string;
  back: string;
}): Promise<{ url: string } | { refused: string } | null> {
  if (!input.recordId) return null;
  const ask = await readAsk(input.subjectKind, input.subjectId);
  if (!ask) return null;
  try {
    const started = await startCheckout({ ask, recordId: input.recordId, origin: input.origin, back: input.back });
    return { url: started.url };
  } catch (thrown) {
    if (thrown instanceof PaymentRefusal) return { refused: thrown.message };
    throw thrown;
  }
}

export type SettleStatus = "paid" | "failed" | "expired" | "refunded";

export async function settle(sessionId: string, status: SettleStatus, paymentIntentId: string | null): Promise<void> {
  const { error } = await billing().rpc("payment_settle", {
    p_checkout_session_id: sessionId,
    p_status: status,
    ...(paymentIntentId ? { p_payment_intent_id: paymentIntentId } : {}),
  });
  if (error) throw new Error(`billing.payment_settle refused: ${error.message}`);
}

/**
 * The return route: re-read the session from Stripe on the payment's own account (never trust
 * the address bar) and settle what Stripe says.
 */
export async function settleFromReturn(paymentId: string, sessionId: string): Promise<"paid" | "expired" | "open"> {
  const { data, error } = await billing().from("payment")
    .select("stripe_account_id, stripe_checkout_session_id")
    .eq("id", paymentId)
    .maybeSingle();
  if (error) throw new Error(`Reading the payment failed: ${error.message}`);
  const row = data as { stripe_account_id: string; stripe_checkout_session_id: string | null } | null;
  if (!row || row.stripe_checkout_session_id !== sessionId) return "open";
  const session = await getStripe().checkout.sessions.retrieve(sessionId, {}, { stripeAccount: row.stripe_account_id });
  const status = settledStatusOf(session);
  if (!status) return "open";
  const intent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
  await settle(sessionId, status, intent);
  return status;
}

/** charge.refunded carries the payment intent; find its session to settle. */
export async function sessionForPaymentIntent(paymentIntentId: string): Promise<string | null> {
  const { data } = await billing().from("payment").select("stripe_checkout_session_id")
    .eq("stripe_payment_intent_id", paymentIntentId).maybeSingle();
  return (data as { stripe_checkout_session_id: string | null } | null)?.stripe_checkout_session_id ?? null;
}

/** The latest payment for a record (portal Pay button state). */
export async function latestPaymentStatus(organizationId: string, recordId: string): Promise<string | null> {
  const { data } = await billing().from("payment").select("status")
    .eq("organization_id", organizationId).eq("record_id", recordId)
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  return (data as { status: string } | null)?.status ?? null;
}
