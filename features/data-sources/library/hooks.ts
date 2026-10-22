"use client";

import { useQuery } from "@tanstack/react-query";
import { formatPoints } from "@ai-matrx/kit/format";

import type { CostDoorRow } from "@/components/cost/CostDoor";
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
 * The price of `n` records of a source, in points only (dollars belong to `CostDoor`'s admin rows, never a built
 * string). Null when the source is unpriced or the rate has not loaded. Battles (lab, unlock) read this; every other
 * surface hands `sourceCostRow` to a `<CostDoor>`.
 */
export function usePriceText() {
  const { rate } = useCostDisplay();
  return (source: Pick<LibrarySource, "pointsPerRecord" | "usd_per_record">, n: number, opts?: { short?: boolean }): string | null => {
    const points = pointsFor(source, n, rate);
    return points == null ? null : formatPoints(points, { short: opts?.short });
  };
}

/** One labelled `CostDoor` row for `n` records of a source: its own points price, else its USD price (the door converts). */
export function sourceCostRow(
  source: Pick<LibrarySource, "pointsPerRecord" | "usd_per_record">,
  n: number,
  label: string,
): CostDoorRow {
  const own = source.pointsPerRecord != null && source.pointsPerRecord >= 0 ? Math.ceil(Number((source.pointsPerRecord * n).toFixed(6))) : undefined;
  return { label, points: own, usd: source.usd_per_record != null ? source.usd_per_record * n : undefined };
}
