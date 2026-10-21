// features/marketing/components/brands/browse/surface.ts
//
// The `matrx-user/marketing` read for /marketing/brands/all: a pure list → scope mapper over the controller
// the shell already holds (never fetches). A failed read reports nothing that would contradict the error.

import type { EntityListSurface, EntityListSurfaceController } from "@/lib/entity-list/components/EntityListPage";
import { createMarketingScope } from "@/features/surfaces/manifests/marketing.manifest";
import type { BrandBrowseRow } from "./service";

export function createBrandListSurfaceScope(list: EntityListSurfaceController<BrandBrowseRow>) {
  if (list.isLoading || list.error != null) return createMarketingScope({ hub_view: "brands" });
  return createMarketingScope({
    hub_view: "brands",
    brand_count: list.total,
    ...(list.rows.length > 0
      ? {
          visible_brands: list.rows.map((row) => ({
            brand_id: row.id,
            name: row.name,
            industry: row.industry,
            description: row.description,
            status: row.status,
            sites: row.sites.map((site) => ({
              site_id: site.id,
              domain: site.domain,
              name: site.name,
              initialized: Boolean(site.initialized_at),
            })),
            social_count: row.social_count,
            asset_count: row.asset_count,
            fact_count: row.fact_count,
            pending_review: row.pending_discovered,
            updated_at: row.updated_at,
          })),
          portfolio_summary: list.rows.map((row) => ({
            brand_id: row.id,
            brand: row.name,
            status: row.status,
            sites: row.sites.map((site) => site.domain),
            pending_review: row.pending_discovered,
          })),
        }
      : {}),
  });
}

export const BRAND_LIST_SURFACE: EntityListSurface<BrandBrowseRow> = {
  surfaceName: "matrx-user/marketing",
  getScope: createBrandListSurfaceScope,
};
