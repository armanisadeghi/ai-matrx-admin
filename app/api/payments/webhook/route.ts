// app/api/payments/webhook/route.ts — the Stripe CONNECT endpoint for business payments.
//
// Events here come from the businesses' own connected accounts (direct charges), so this is a
// separate endpoint from the platform billing webhook (/api/stripe/webhook), with its own
// secret pair (lib/stripe/server.ts, endpoint "connect"): STRIPE_CONNECT_WEBHOOK_SECRET is the live
// secret in production and the test secret elsewhere; production's test endpoint secret is
// STRIPE_TEST_MODE_CONNECT_WEBHOOK_SECRET. An event is accepted only under the secret of its own
// livemode, so a test event can never settle through the live endpoint's secret or the reverse.
// Every write goes through billing.payment_settle, which is idempotent and forward-only, so
// Stripe's retries and the return route racing this endpoint never double-apply.

import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { StripeWebhookVerificationError, verifyStripeWebhook } from "@/lib/stripe/server";
import { sessionForPaymentIntent, settle, syncAccount } from "@/features/payments/server";

export const dynamic = "force-dynamic";

function intentOf(session: Stripe.Checkout.Session): string | null {
  return typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null;
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  const body = await request.text();
  let event: Stripe.Event;
  try {
    ({ event } = verifyStripeWebhook(body, signature, "connect"));
  } catch (thrown) {
    if (thrown instanceof StripeWebhookVerificationError && /No Stripe webhook secrets/.test(thrown.message)) {
      return NextResponse.json({ error: "The Connect webhook secret is not configured." }, { status: 503 });
    }
    return NextResponse.json({ error: "Signature did not verify." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        if (session.payment_status === "paid") await settle(session.id, "paid", intentOf(session));
        break;
      }
      case "checkout.session.async_payment_failed":
        await settle(event.data.object.id, "failed", intentOf(event.data.object));
        break;
      case "checkout.session.expired":
        await settle(event.data.object.id, "expired", null);
        break;
      case "charge.refunded": {
        const charge = event.data.object;
        const intent = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (intent && charge.refunded) {
          const sessionId = await sessionForPaymentIntent(intent);
          if (sessionId) await settle(sessionId, "refunded", intent);
        }
        break;
      }
      case "account.updated":
        await syncAccount(event.data.object);
        break;
      default:
        break;
    }
  } catch (thrown) {
    // A 500 makes Stripe retry, which is what we want for a write that did not land.
    console.error("[payments/webhook]", event.type, thrown instanceof Error ? thrown.message : thrown);
    return NextResponse.json({ error: "Not recorded; Stripe will retry." }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
