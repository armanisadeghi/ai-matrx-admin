"use client";

/**
 * What the brand already keeps, read for the Discovery Inbox's duplicate check (discovery-duplicates.ts): its
 * competitors (profile list + seo.competitor — the Relationships card and the Competitors page), people already
 * linked, and offerings already in the products tree. Same reads as those screens, so the Inbox and they agree.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { listBrandRelations, profileCompetitors } from "@/features/marketing/data/brand-relations";
import { listBrandCompetitors } from "@/features/marketing/competitors/brand-competitors";
import { listBrandOfferings } from "@/features/marketing/smart-add/enrich/brandState";
import type { KeptOnBrand } from "@/features/marketing/discovery-duplicates";
import type { MarketingBrand, MarketingSite } from "@/features/marketing/types";

export function useKeptOnBrand(
  brandId: string,
  brand: MarketingBrand | null,
  sites: readonly MarketingSite[] | null,
): KeptOnBrand {
  const siteIds = useMemo(() => (sites ?? []).map((s) => s.id), [sites]);
  // access-errors: ok — duplicate-check context under the gated brand + items primaries; absence only shows a duplicate
  const competitors = useQuery({
    queryKey: ["marketing", "brand", brandId, "competitor-directory", siteIds],
    queryFn: ({ signal }) => listBrandCompetitors(brandId, siteIds, signal),
    enabled: sites !== null,
  });
  // access-errors: ok — same
  const relations = useQuery({ queryKey: ["marketing", "brand-relations", brandId], queryFn: () => listBrandRelations(brandId) });
  // access-errors: ok — same
  const offerings = useQuery({ queryKey: ["marketing", "brand", brandId, "offering-names"], queryFn: () => listBrandOfferings(brandId) });
  return useMemo(
    () => ({
      competitors: [
        ...profileCompetitors(brand?.profile ?? null).map((c) => ({ name: c.name, domain: c.domain ?? c.url ?? null })),
        ...(competitors.data ?? []).map((c) => ({ name: c.name, domain: c.domain })),
      ],
      people: (relations.data ?? []).map((r) => ({ name: r.label, domain: r.url })),
      offerings: (offerings.data ?? []).map((o) => ({ name: o.name })),
    }),
    [brand, competitors.data, relations.data, offerings.data],
  );
}
