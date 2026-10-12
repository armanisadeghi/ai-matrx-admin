"use client";

import { useQuery } from "@tanstack/react-query";
import { formatPoints } from "@ai-matrx/kit/format";

import { formatAdminUsd } from "@/components/cost/formatAdminCost";
import { useCostDisplay, useSeesDollars } from "@/components/cost/useCostDisplay";
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
 * The price of `n` records of a source, as this viewer's SEAT sees it (the one cost rule, `useSeesDollars`):
 * a member reads "150 points"; a seat that may see dollars reads "$0.01 · 150 points" (cents, the
 * source's own points beside it). Null when the source is unpriced or the rate has not loaded.
 * Every quote and result in data-sources (library, board tile, table bar, chat card, CRM, Maps) comes here.
 */
export function usePriceText() {
  const { rate } = useCostDisplay();
  const seesDollars = useSeesDollars();
  return (source: Pick<LibrarySource, "pointsPerRecord" | "usd_per_record">, n: number, opts?: { short?: boolean }): string | null => {
    const points = pointsFor(source, n, rate);
    const pointsText = points == null ? null : formatPoints(points, { short: opts?.short });
    if (seesDollars && source.usd_per_record != null) {
      const usd = formatAdminUsd(source.usd_per_record * n);
      return pointsText ? `${usd} · ${pointsText}` : usd;
    }
    return pointsText;
  };
}
