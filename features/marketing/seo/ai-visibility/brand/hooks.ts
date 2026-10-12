"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  brandChecksKey,
  estimateBrandCheck,
  listBrandChecks,
  runBrandCheck,
} from "./data";

export function useBrandChecks(brandId: string) {
  return useQuery({
    queryKey: brandChecksKey(brandId),
    queryFn: () => listBrandChecks(brandId),
  });
}

export function useBrandCheckEstimate(brandId: string, organizationId: string, enabled = true) {
  return useQuery({
    queryKey: [...brandChecksKey(brandId), "estimate"] as const,
    queryFn: ({ signal }) => estimateBrandCheck(brandId, organizationId, signal),
    enabled,
    staleTime: 60_000,
  });
}

export function useRunBrandCheck(brandId: string, organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (maxCostUsd: number) => runBrandCheck(brandId, organizationId, maxCostUsd),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: brandChecksKey(brandId) });
    },
  });
}
