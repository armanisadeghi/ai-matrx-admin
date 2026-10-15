"use client";

import { useQuery } from "@tanstack/react-query";

import { useOrganizationRequired } from "@/features/organizations/useOrganizationRequired";

import { getKinds } from "./server";

/** The organization a comparison runs in and bills to: the one the person works in. */
export function useComparisonOrganizationId(): string | null {
  return useOrganizationRequired().organizationId ?? null;
}

export const kindsKey = (organizationId: string | null) => ["comparison", "kinds", organizationId] as const;

/** What the engine can compare (live kinds first, then coming), cached for the session. */
export function useComparisonKinds(organizationId: string | null) {
  return useQuery({
    queryKey: kindsKey(organizationId),
    queryFn: ({ signal }) => getKinds({ organizationId: organizationId ?? "", signal }),
    enabled: Boolean(organizationId),
    staleTime: 5 * 60 * 1000,
  });
}
