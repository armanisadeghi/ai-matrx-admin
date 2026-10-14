"use client";

/**
 * What a Refresh of a connected own account uses, and whether its daily Auto-update is on.
 * One read for the whole brand screen; points go through the one cost formatter (`useCostDisplay`).
 * Rule (Arman, 2026-10-14): Refresh is a click; Auto-update is a per-account choice, off by default, with
 * its points shown. Nothing here turns anything on by itself.
 */

import { useQuery } from "@tanstack/react-query";
import { useCostDisplay } from "@/components/cost/useCostDisplay";
import { getConnectedAccountPlans, type ConnectedAccountPlan } from "./server";
import { socialKeys } from "./hooks";

export const RUNS_PER_MONTH = 30;

export function useConnectedPlans(organizationId: string | null | undefined, enabled: boolean) {
  const { format } = useCostDisplay();
  const plans = useQuery({
    queryKey: [...socialKeys.all, "connected-plans", organizationId] as const,
    queryFn: ({ signal }) => getConnectedAccountPlans({ organizationId: organizationId ?? "", signal }),
    enabled: enabled && Boolean(organizationId),
    staleTime: 5 * 60 * 1000,
  });
  const byTracked = new Map<string, ConnectedAccountPlan>((plans.data ?? []).map((p) => [p.tracked_account_id, p]));

  /** "Free" for an official read, the points for a paid one, null while unknown. */
  function refreshCost(trackedAccountId: string | null | undefined): string | null {
    const plan = trackedAccountId ? byTracked.get(trackedAccountId) : undefined;
    if (!plan || plan.usd_per_refresh == null) return null;
    return plan.usd_per_refresh === 0 ? "Free" : format(plan.usd_per_refresh);
  }

  /** The Auto-update setting's cost words: per run and an estimated month. */
  function autoUpdateCost(trackedAccountId: string | null | undefined): string | null {
    const plan = trackedAccountId ? byTracked.get(trackedAccountId) : undefined;
    if (!plan || plan.usd_per_refresh == null) return null;
    if (plan.usd_per_refresh === 0) return "Free";
    return `${format(plan.usd_per_refresh)} a run · about ${format(plan.usd_per_refresh * RUNS_PER_MONTH)} a month`;
  }

  return { byTracked, refreshCost, autoUpdateCost };
}
