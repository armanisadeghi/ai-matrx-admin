// CD-PAY-01/07, found live 2026-10-22: on www.aimatrx.com (live Stripe) Ashford Labs' TEST Stripe
// account showed "Taking payments" in Settings > Payments, while every Pay on its portal was refused
// ("the connected Stripe account is in the other mode"). The badge must say what a payer on THIS
// site will get.
import { accountBadge } from "@/features/payments/account-state";

describe("the Payments badge says what a payer on this site gets", () => {
  it("a test account on the live site is not taking payments", () => {
    const b = accountBadge({ connected: true, livemode: false, charges_enabled: true }, "live");
    expect(b.canCharge).toBe(false);
    expect(b.label).not.toBe("Taking payments");
    expect(b.line).toBeTruthy();
  });

  it("a live account on a test site is not taking payments there either", () => {
    const b = accountBadge({ connected: true, livemode: true, charges_enabled: true }, "test");
    expect(b.canCharge).toBe(false);
    expect(b.label).not.toBe("Taking payments");
  });

  it("an account in this site's mode with charges on is taking payments", () => {
    expect(accountBadge({ connected: true, livemode: true, charges_enabled: true }, "live")).toMatchObject({ label: "Taking payments", canCharge: true, line: null });
    expect(accountBadge({ connected: true, livemode: false, charges_enabled: true }, "test")).toMatchObject({ label: "Taking payments", canCharge: true });
  });

  it("setup not finished and not connected keep their words", () => {
    expect(accountBadge({ connected: true, livemode: true, charges_enabled: false }, "live").label).toBe("Setup not finished");
    expect(accountBadge({ connected: false }, "live").label).toBe("Not connected");
  });
});
