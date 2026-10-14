import { createProperty, createSite, getBrand } from "@/features/marketing/data/service";
import type { SiteClaimDeps } from "./siteOwnership";

/** The live wiring of claimSite: the site RPC, a website property row, and a readable brand's name. */
export const liveSiteClaimDeps: SiteClaimDeps = {
  createSite,
  createWebsiteProperty: (p) =>
    createProperty({ organizationId: p.organizationId, brandId: p.brandId, kind: "website", url: p.url, handle: null, displayName: p.displayName, status: "active" }),
  brandName: async (id) => (await getBrand(id)).name,
};
