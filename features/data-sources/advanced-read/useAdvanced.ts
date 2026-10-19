"use client";

import { useQuery } from "@tanstack/react-query";

import { useLibraryOrganizationId } from "../library/hooks";
import type { AdvancedAllow, Quote } from "./contract";
import { batchedQuote } from "./quoteBatcher";

/**
 * The free quote for `urls`: which readers cover them and the most they can cost, BEFORE anything is
 * clicked. Every ask made in the same tick joins ONE request (see quoteBatcher); nothing is billed.
 */
export function useAdvancedQuote(urls: readonly string[], allow: AdvancedAllow, enabled = true) {
  const organizationId = useLibraryOrganizationId();
  const key = [...new Set(urls)].sort();
  return useQuery<Quote>({
    queryKey: ["advanced-read", "quote", organizationId, allow, key.join("\n")],
    enabled: enabled && Boolean(organizationId) && key.length > 0,
    staleTime: 5 * 60 * 1000,
    retry: false,
    queryFn: () => batchedQuote({ organizationId: organizationId ?? "", urls: key, allow }),
  });
}
