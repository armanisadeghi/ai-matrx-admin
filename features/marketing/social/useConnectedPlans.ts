"use client";

/**
 * What a Refresh of a connected own account uses, and how often it updates automatically.
 * One read for the whole brand screen.
 * Rule (Arman, 2026-10-14): free reads update automatically at the person's chosen frequency (default every
 * 6 hours); a paid read (X) is never automatic — Refresh only, its points named.
 */

import { useMemo } from "react";
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
  const byTracked = useMemo(
    () => new Map<string, ConnectedAccountPlan>((plans.data ?? []).map((p) => [p.tracked_account_id, p])),
    [plans.data],
  );

  /** "Free" for a truly free read, the server's points for a paid one, `null` while the cost is unknown (never "Free"). */
  function refreshCost(trackedAccountId: string | null | undefined): string | null {
    const plan = trackedAccountId ? byTracked.get(trackedAccountId) : undefined;
    if (!plan || plan.usd_per_refresh == null || plan.points_per_refresh == null) return null;
    return plan.usd_per_refresh === 0 ? "Free" : pointsText(plan.points_per_refresh);
  }

  return { byTracked, refreshCost };
}

/** A frequency's label: Off, Every hour, Every 6 hours, Daily. */
export function frequencyLabel(hours: number): string {
  if (hours <= 0) return "Off";
  if (hours === 1) return "Every hour";
  if (hours === 24) return "Daily";
  return `Every ${hours} hours`;
}
