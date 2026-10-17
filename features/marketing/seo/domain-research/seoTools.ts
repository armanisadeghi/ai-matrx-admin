// features/marketing/seo/domain-research/seoTools.ts — the catalog Tools this screen runs, found by
// JOB (never by a copied Tool id) in the one SEO family the catalog search serves. Prices before a press
// are the Tools' own price hints, in points. Pure helpers are tested; the hook is one cached read.

import { useQuery } from "@tanstack/react-query";
import { CATALOG_SEARCH_PATH, type CatalogSearchResponse, type CatalogToolHit } from "@ai-matrx/agents/tools";

import { getJson } from "@/lib/python-client";

/** The jobs of this screen, in the catalog's own keys. */
export const SEO_JOBS = {
  authority: "seo_domain_authority",
  authorityScore: "seo_authority_score",
  links: "seo_backlinks_summary",
  linkRows: "seo_backlink_rows",
  searchAds: "seo_search_ads_overview",
  keywords: "seo_keyword_data",
} as const;

export type SeoJobKey = keyof typeof SEO_JOBS;
export type SeoTools = Partial<Record<SeoJobKey, CatalogToolHit>>;

/** Hits of the SEO family arranged by what this screen calls them; a job the catalog does not serve is absent. */
export function arrangeSeoTools(hits: readonly CatalogToolHit[]): SeoTools {
  const byJob = new Map(hits.map((h) => [h.job_key, h]));
  const out: SeoTools = {};
  for (const key of Object.keys(SEO_JOBS) as SeoJobKey[]) {
    const hit = byJob.get(SEO_JOBS[key]);
    if (hit) out[key] = hit;
  }
  return out;
}

/** What a set of Tools costs together, in points; null when any price is unknown. */
export function pointsTogether(hits: readonly (CatalogToolHit | undefined)[]): number | null {
  let total = 0;
  for (const hit of hits) {
    if (!hit || hit.price_hint_points == null) return null;
    total += hit.price_hint_points;
  }
  return total;
}

export function useSeoTools() {
  return useQuery<SeoTools>({
    queryKey: ["marketing", "seo-tools", "catalog"],
    staleTime: 5 * 60_000,
    queryFn: async ({ signal }) => {
      const { data } = await getJson<CatalogSearchResponse>(`${CATALOG_SEARCH_PATH}?job_family=seo&limit=50`, { signal });
      return arrangeSeoTools(data.tools);
    },
  });
}

/** Typed words become the list a list input sends: one phrase per line or comma; the rest passes through. */
export function splitPhrases(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value !== "string") return [];
  const seen = new Set<string>();
  for (const part of value.split(/[\n,]/)) {
    const phrase = part.trim();
    if (phrase) seen.add(phrase);
  }
  return [...seen];
}

/** Makes every input the form declared as a list (`json_schema.type: "array"`) a real list before it is sent. */
export function withLists(
  declared: readonly { name: string; jsonSchema: Record<string, unknown> }[],
  values: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...values };
  for (const input of declared) {
    if (input.jsonSchema.type === "array" && input.name in out) out[input.name] = splitPhrases(out[input.name]);
  }
  return out;
}
