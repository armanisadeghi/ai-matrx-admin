// features/pricing/education/yourPlan.ts
//
// Which education-pricing card carries "Your plan". The person's plan is the
// effective plan key from billing.user_usage_state (usage-gate Redux state) —
// never the coarse entitlement tier, which says "premium" for Entry AND Pro.

import type { EntitlementTier } from "@/features/entitlements/types";

export type YourPlanCard =
  /** Signed out. */
  | "none"
  /** On the free plan: the Free card is theirs. */
  | "free"
  /** On the plan the paid card sells. */
  | "paid"
  /** On a higher plan than either card: both cards are included in it. */
  | "above";

export function yourPlanCard(args: {
  isAuthenticated: boolean;
  planKey: string | null;
  tier: EntitlementTier;
  freePlanKey: string | null;
  paidPlanKey: string | null;
}): YourPlanCard {
  const { isAuthenticated, planKey, tier, freePlanKey, paidPlanKey } = args;
  if (!isAuthenticated) return "none";
  if (planKey) {
    if (planKey === freePlanKey) return "free";
    if (planKey === paidPlanKey) return "paid";
    return "above";
  }
  // The usage answer has not landed: fall back to the coarse tier, which can
  // only say "paying" — never which card, so it does not mark one.
  return tier === "premium" ? "above" : "free";
}
