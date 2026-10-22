// features/payments/account-state.ts — what the Payments settings badge says about the connected
// Stripe account. Pure: the page passes the account status it read and THIS SITE's Stripe mode.
// A connected account in the OTHER Stripe mode (a test account on the live site, a live account on
// a test site) cannot charge anyone here, so it never reads "Taking payments" (CD-PAY 2026-10-22).

export type SiteStripeMode = "test" | "live";

export interface AccountStatusForBadge {
  connected: boolean;
  livemode?: boolean;
  charges_enabled?: boolean;
}

export interface AccountBadge {
  label: string;
  tone: "success" | "warning" | "neutral";
  /** True only when a payer on this site can actually be charged through the account. */
  canCharge: boolean;
  /** One short line under the badge when the account cannot charge here, else null. */
  line: string | null;
}

export function accountBadge(status: AccountStatusForBadge, siteMode: SiteStripeMode): AccountBadge {
  if (!status.connected) return { label: "Not connected", tone: "neutral", canCharge: false, line: null };
  if (Boolean(status.livemode) !== (siteMode === "live")) {
    return status.livemode
      ? { label: "Live account", tone: "warning", canCharge: false, line: "This test site cannot charge a live account." }
      : { label: "Test account", tone: "warning", canCharge: false, line: "Payers are refused here until you connect your live Stripe account." };
  }
  return status.charges_enabled
    ? { label: "Taking payments", tone: "success", canCharge: true, line: null }
    : { label: "Setup not finished", tone: "warning", canCharge: false, line: null };
}
