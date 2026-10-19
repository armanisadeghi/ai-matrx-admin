"use client";

/**
 * How often a connected own account updates automatically.
 * One read for the whole brand screen.
 * Rule (Arman, 2026-10-14): free reads update automatically at the person's chosen frequency (default every
 * 6 hours); a paid read (X) is never automatic — Refresh only.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getConnectedAccountPlans, type ConnectedAccountPlan } from "./server";
import { socialKeys } from "./hooks";

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

  return { byTracked };
}

/** A frequency's label: Off, Every hour, Every 6 hours, Daily. */
export function frequencyLabel(hours: number): string {
  if (hours <= 0) return "Off";
  if (hours === 1) return "Every hour";
  if (hours === 24) return "Daily";
  return `Every ${hours} hours`;
}
