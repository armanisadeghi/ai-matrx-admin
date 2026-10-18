/** @jest-environment node */
// The Connect webhook (/api/payments/webhook) accepts an event only under the secret of its own
// livemode, through the same verifier the platform billing webhook uses (endpoint "connect").
// Going live is then a switch: add the live endpoint's secret, nothing in code changes.

import { createHmac } from "node:crypto";
import { getWebhookSecret, StripeWebhookVerificationError, verifyStripeWebhook } from "@/lib/stripe/server";

function signed(payload: string, secret: string): string {
  const t = Math.floor(Date.now() / 1000);
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${payload}`).digest("hex")}`;
}

function event(livemode: boolean): string {
  return JSON.stringify({
    id: `evt_${livemode ? "live" : "test"}_connect`,
    object: "event",
    type: "checkout.session.completed",
    account: "acct_fixture",
    created: Math.floor(Date.now() / 1000),
    livemode,
    data: { object: { id: "cs_fixture", object: "checkout.session", payment_status: "paid" } },
  });
}

describe("Connect webhook secrets resolve by mode", () => {
  const original = { ...process.env };
  afterEach(() => { process.env = { ...original }; });

  function production() {
    process.env.VERCEL_ENV = "production";
    process.env.STRIPE_SECRET_KEY = "sk_live_fixture";
    process.env.STRIPE_TEST_MODE_SECRET_KEY = "sk_test_fixture";
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET = "whsec_connect_live";
    process.env.STRIPE_TEST_MODE_CONNECT_WEBHOOK_SECRET = "whsec_connect_test";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_platform_live";
  }

  it("names the connect secret pair the way the platform pair is named", () => {
    production();
    expect(getWebhookSecret("live", "connect")).toBe("whsec_connect_live");
    expect(getWebhookSecret("test", "connect")).toBe("whsec_connect_test");
    expect(getWebhookSecret("live")).toBe("whsec_platform_live");
    process.env.VERCEL_ENV = "preview";
    expect(getWebhookSecret("test", "connect")).toBe("whsec_connect_live");
  });

  it("accepts a live event under the live secret and a test event under the test secret", () => {
    production();
    const live = event(true);
    expect(verifyStripeWebhook(live, signed(live, "whsec_connect_live"), "connect").mode).toBe("live");
    const test = event(false);
    expect(verifyStripeWebhook(test, signed(test, "whsec_connect_test"), "connect").mode).toBe("test");
  });

  it("refuses a wrong-mode event: a test event signed with the live secret, and the reverse", () => {
    production();
    const test = event(false);
    expect(() => verifyStripeWebhook(test, signed(test, "whsec_connect_live"), "connect")).toThrow(StripeWebhookVerificationError);
    const live = event(true);
    expect(() => verifyStripeWebhook(live, signed(live, "whsec_connect_test"), "connect")).toThrow(StripeWebhookVerificationError);
  });

  it("refuses a forged event and the platform endpoint's secret", () => {
    production();
    const live = event(true);
    expect(() => verifyStripeWebhook(live, signed(live, "whsec_forged"), "connect")).toThrow(StripeWebhookVerificationError);
    expect(() => verifyStripeWebhook(live, signed(live, "whsec_platform_live"), "connect")).toThrow(StripeWebhookVerificationError);
  });

  it("outside production only the test ledger is accepted", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.STRIPE_TEST_MODE_SECRET_KEY = "sk_test_fixture";
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET = "whsec_connect_preview";
    const live = event(true);
    expect(() => verifyStripeWebhook(live, signed(live, "whsec_connect_preview"), "connect")).toThrow(StripeWebhookVerificationError);
    const test = event(false);
    expect(verifyStripeWebhook(test, signed(test, "whsec_connect_preview"), "connect").mode).toBe("test");
  });
});
