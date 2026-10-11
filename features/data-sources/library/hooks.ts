"use client";

import { useQuery } from "@tanstack/react-query";
import { formatPoints } from "@ai-matrx/kit/format";

import { useCostDisplay } from "@/components/cost/useCostDisplay";
import { useOrganizationRequired } from "@/features/organizations/useOrganizationRequired";

import { pointsFor, type LibrarySource } from "./catalog";
import { getLibrary } from "./server";

export const libraryKey = (organizationId: string | null) => ["data-sources", "library", organizationId] as const;

/** The organization a library fetch is billed to: the one the person works in. */
export function useLibraryOrganizationId(): string | null {
  // org-filter: write-target a fetch makes a new table and spends points in this organization
  return useOrganizationRequired().organizationId ?? null;
}

/** The whole library (every source, groups, limits), cached for the session. */
export function useLibrary(organizationId: string | null) {
  return useQuery({
    queryKey: libraryKey(organizationId),
    queryFn: ({ signal }) => getLibrary({ organizationId: organizationId ?? "", signal }),
    enabled: Boolean(organizationId),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * The price of `n` records of a source, as this viewer sees it: points for everyone (the source's
 * OWN price), dollars only for an admin who flipped the switch and only when the source has a USD
 * price. Null when the source is unpriced or the rate has not loaded.
 */
export function usePriceText() {
  const { unit, rate, format } = useCostDisplay();
  return (source: Pick<LibrarySource, "pointsPerRecord" | "usd_per_record">, n: number, opts?: { short?: boolean }): string | null => {
    if (unit === "usd" && source.usd_per_record != null) return format(source.usd_per_record * n, { short: opts?.short });
    const points = pointsFor(source, n, rate);
    return points == null ? null : formatPoints(points, { short: opts?.short });
  };
}
