"use client";

import { useQuery } from "@tanstack/react-query";
import { formatPoints } from "@ai-matrx/kit/format";

import { useLibraryOrganizationId } from "../library/hooks";
import type { AdvancedAllow, Quote } from "./contract";
import { quoteAdvancedRead } from "./server";

/**
 * The free quote for `urls`: which readers cover them and the most they can cost, BEFORE anything is
 * clicked. Cached per organization + addresses; nothing is billed.
 */
export function useAdvancedQuote(urls: readonly string[], allow: AdvancedAllow, enabled = true) {
  const organizationId = useLibraryOrganizationId();
  const key = [...new Set(urls)].sort();
  return useQuery<Quote>({
    queryKey: ["advanced-read", "quote", organizationId, allow, key.join("\n")],
    enabled: enabled && Boolean(organizationId) && key.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: ({ signal }) => quoteAdvancedRead({ organizationId: organizationId ?? "", urls: key, allow, signal }),
  });
}

/** "Up to 14 points" — or null when the server named no price. */
export function costText(pointsUpTo: number | null | undefined): string | null {
  if (pointsUpTo == null) return null;
  return pointsUpTo <= 0 ? "Free" : `Up to ${formatPoints(pointsUpTo)}`;
}
