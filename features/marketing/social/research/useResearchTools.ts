"use client";

/**
 * The catalog Tools behind the Look up screen, found by their job key. One read per family; the
 * catalog is the only place a Tool's id lives, so a Tool that does not exist yet is simply absent
 * and the screen says so (`stepsServed`).
 */

import { useQuery } from "@tanstack/react-query";
import { CATALOG_SEARCH_PATH, catalogSearchQuery, type CatalogSearchResponse, type CatalogToolHit } from "@ai-matrx/agents/tools";

import { getJson } from "@/lib/python-client";

import { RESEARCH_JOBS } from "./sources";

const FAMILIES = ["social", "ads"] as const;

async function readFamily(family: string, signal: AbortSignal): Promise<CatalogToolHit[]> {
  const { data } = await getJson<CatalogSearchResponse>(`${CATALOG_SEARCH_PATH}${catalogSearchQuery({ q: "", job_family: family, limit: 50 })}`, { signal });
  return data.tools;
}

export function useResearchTools() {
  return useQuery<ReadonlyMap<string, CatalogToolHit>>({
    queryKey: ["social", "research", "tools"],
    staleTime: 5 * 60 * 1000,
    queryFn: async ({ signal }) => {
      const pages = await Promise.all(FAMILIES.map((family) => readFamily(family, signal)));
      const wanted = new Set(RESEARCH_JOBS);
      const byJob = new Map<string, CatalogToolHit>();
      for (const hit of pages.flat()) if (wanted.has(hit.job_key)) byJob.set(hit.job_key, hit);
      return byJob;
    },
  });
}
