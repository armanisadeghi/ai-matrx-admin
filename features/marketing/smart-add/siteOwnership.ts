// A domain is ONE site record per organization (web.site is unique on organization + domain) and
// that record belongs to one brand. Smart Add's Create/answer must never take it from the brand that
// already tracks it (2026-10-14: Create of a second brand moved ritualcoffee.com's site away). When
// the site is another brand's, the new brand gets its own website property for the address and the
// person is told once, with the choice to link (move) it left to them.
import type { MarketingSite } from "@/features/marketing/types";

export type SiteClaim =
  | { kind: "own"; site: MarketingSite }
  | { kind: "tracked-elsewhere"; site: MarketingSite; otherBrandId: string; otherBrandName: string | null; note: string };

export interface SiteClaimDeps {
  createSite: (input: {
    organizationId: string;
    name: string;
    rootUrl: string;
    domain: string;
    brandId: string;
  }) => Promise<MarketingSite>;
  createWebsiteProperty: (input: { organizationId: string; brandId: string; url: string; displayName: string }) => Promise<unknown>;
  brandName: (brandId: string) => Promise<string | null>;
}

export function trackedElsewhereNote(host: string, otherBrandName: string | null): string {
  return `${host}: Already tracked under ${otherBrandName ?? "another brand"}`;
}

/** Create-or-find the site for this brand without ever reassigning an existing one. */
export async function claimSite(
  deps: SiteClaimDeps,
  input: { organizationId: string; brandId: string; rootUrl: string; host: string },
): Promise<SiteClaim> {
  const site = await deps.createSite({
    organizationId: input.organizationId,
    name: input.host,
    rootUrl: input.rootUrl,
    domain: input.host,
    brandId: input.brandId,
  });
  if (!site.brand_id || site.brand_id === input.brandId) return { kind: "own", site };
  const otherBrandName = await deps.brandName(site.brand_id).catch(() => null);
  await deps.createWebsiteProperty({
    organizationId: input.organizationId,
    brandId: input.brandId,
    url: input.rootUrl,
    displayName: input.host,
  });
  return {
    kind: "tracked-elsewhere",
    site,
    otherBrandId: site.brand_id,
    otherBrandName,
    note: trackedElsewhereNote(input.host, otherBrandName),
  };
}
