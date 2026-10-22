"use client";

// features/marketing/components/brands/browse/listConfig.tsx — /marketing/brands/all on the canonical
// entity-list shell (lib/entity-list). Cards are the default view (Arman, 2026-10-21); the table is one click away.

import type { EntityListConfig } from "@/lib/entity-list/config";
import { formatRelativeTime } from "@ai-matrx/kit/format";
import { webLocation } from "@/features/marketing/lib/copy-payloads";
import { BrandBrowseCards } from "./BrandBrowseCards";
import { BRAND_COLUMNS } from "./columns";
import { BRAND_LIST_SCOPES, createBrandListService, type BrandBrowseRow } from "./service";
import { BRAND_BULK_ACTIONS, useBrandRowActions } from "./useBrandRowActions";
import { marketingRoutes } from "@/features/marketing/lib/routes";

export const brandListConfig: EntityListConfig<BrandBrowseRow> = {
  surfaceKey: "marketing-brands-browse",
  registryToken: "web_brand",
  entityLabel: { singular: "brand", plural: "brands" },
  sourceFeature: "marketing",
  scopes: [...BRAND_LIST_SCOPES],
  // A brand is homed to an organization, never a team.
  lanes: { team: false },
  service: createBrandListService(),
  columns: BRAND_COLUMNS,
  prefsVersion: 1,
  prefsDefaults: { sort: "name", direction: "asc", view: "cards" },
  getRowId: (row) => row.id,
  getRowName: (row) => row.name,
  getRowEntity: (row) => ({ type: "web_brand", id: row.id, title: row.name }),
  door: { hrefFor: (row) => marketingRoutes.brand(row.id) },
  useRowActions: useBrandRowActions,
  supportsArchived: true,
  // Archive goes through BrandArchiveFlow (it names the shared items an archive takes with it); the generic
  // bulk Move to Trash would skip that sentence, so it is off here.
  standardBulkActions: { trash: false },
  bulkActions: BRAND_BULK_ACTIONS,
  facetSections: [
    { facet: "status", filterId: "status", label: "Status", noneLabel: "No status" },
    { facet: "industry", filterId: "industry", label: "Industry", noneLabel: "No industry" },
  ],
  searchPlaceholder: "Search brand name or website…",
  views: { cards: (p) => <BrandBrowseCards {...p} /> },
  copy: {
    label: "Brand",
    listLabel: "Brand portfolio view",
    location: webLocation("Brands portfolio"),
    rowKind: "web-brand",
    listKind: "web-brands-list",
    humanRow: (row) =>
      `${row.name}${row.industry ? ` (${row.industry})` : ""} — ${row.sites.map((s) => s.domain).join(", ") || "no website"}, updated ${formatRelativeTime(row.updated_at)}`,
  },
  emptyState: {
    title: "No brands yet",
    description: "Add a brand from a website or social link.",
  },
};
