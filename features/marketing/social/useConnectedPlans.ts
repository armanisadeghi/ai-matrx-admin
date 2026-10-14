"use client";

/**
 * What a Refresh of a connected own account uses, and whether its daily Auto-update is on.
 * One read for the whole brand screen; points go through the one cost formatter (`useCostDisplay`).
 * Rule (Arman, 2026-10-14): Refresh is a click; Auto-update is a per-account choice, off by default, with
 * its points shown. Nothing here turns anything on by itself.
 */

import { useQuery } from "@tanstack/react-query";
import { getConnectedAccountPlans, type ConnectedAccountPlan } from "./server";
import { socialKeys } from "./hooks";

/** Said wherever a cost cannot be named yet (plans loading, or a provider the server cannot price). */
export const COST_NOT_KNOWN = "Cost not known yet";

function pointsText(points: number): string {
  return `${points.toLocaleString()} ${points === 1 ? "point" : "points"}`;
}

export function useConnectedPlans(organizationId: string | null | undefined, enabled: boolean) {
  const plans = useQuery({
    queryKey: [...socialKeys.all, "connected-plans", organizationId] as const,
    queryFn: ({ signal }) => getConnectedAccountPlans({ organizationId: organizationId ?? "", signal }),
    enabled: enabled && Boolean(organizationId),
    staleTime: 5 * 60 * 1000,
  });
  const byTracked = new Map<string, ConnectedAccountPlan>((plans.data ?? []).map((p) => [p.tracked_account_id, p]));

  /** "Free" for a truly free read, the server's points for a paid one, `null` while the cost is unknown (never "Free"). */
  function refreshCost(trackedAccountId: string | null | undefined): string | null {
    const plan = trackedAccountId ? byTracked.get(trackedAccountId) : undefined;
    if (!plan || plan.usd_per_refresh == null || plan.points_per_refresh == null) return null;
    return plan.usd_per_refresh === 0 ? "Free" : pointsText(plan.points_per_refresh);
  }

  /** The Auto-update setting's cost words, all from the server: points per run and per month. `null` = unknown. */
  function autoUpdateCost(trackedAccountId: string | null | undefined): string | null {
    const plan = trackedAccountId ? byTracked.get(trackedAccountId) : undefined;
    if (!plan || plan.usd_per_refresh == null || plan.points_per_refresh == null) return null;
    if (plan.usd_per_refresh === 0) return "Free";
    if (plan.points_per_month == null) return null;
    return `${pointsText(plan.points_per_refresh)} a run · about ${pointsText(plan.points_per_month)} a month`;
  }

  return { byTracked, refreshCost, autoUpdateCost };
}
