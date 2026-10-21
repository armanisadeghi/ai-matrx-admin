// features/marketing/components/brands/browse/service.ts
//
// /marketing/brands/all on the canonical list shell. A person holds tens of brands, so the whole
// visible set is read COMPLETELY (the same enriched read the old portfolio paged through) and
// search, sort, lanes, the organization filter and paging run over all of it
// (`createMemoryListService`) — the shape /applets and /board use.
//
// Lanes are honest predicates over the row, never the active org (access-ladder.md §6):
//   mine   — brands the person made
//   orgs   — brands homed to one of the person's organizations
//   public — brands published to the web
//   shared — readable only because it was shared: not hers, not her organizations', not public
//   all    — Mine ∪ My Orgs ∪ Shared (a stranger's public brand lives in Public only)
//
// THE ARCHIVED-ITEMS LAW: the shell's Archived value is passed to the read (`deleted_at`).

import type { EntityListService } from "@/lib/entity-list/config";
import type { ArchivedFilter, EntityListQuery, EntityScopeCounts } from "@/lib/entity-list/types";
import { createMemoryListService, type MemoryServiceOptions } from "@/lib/entity-list/memoryService";
import { listBrands } from "@/features/marketing/data/service";
import { readMemberOrganizationRows } from "@/features/organizations/service/memberOrganizationRows";
import { getClaimsUser } from "@/utils/supabase/claimsUser";
import { supabase } from "@/utils/supabase/client";
import type { BrandListRow } from "@/features/marketing/types";

export const BRAND_LIST_SCOPES = ["all", "mine", "orgs", "shared", "public"] as const;
type BrandLane = (typeof BRAND_LIST_SCOPES)[number];

/** One row of /marketing/brands/all: the enriched brand plus where it sits for THIS person. */
export interface BrandBrowseRow extends BrandListRow {
  is_mine: boolean;
  in_my_orgs: boolean;
  is_public: boolean;
  archived: boolean;
}

const PAGE = 100;

async function readEveryBrand(archived: ArchivedFilter): Promise<BrandListRow[]> {
  const out: BrandListRow[] = [];
  for (let page = 1; ; page++) {
    const { rows, total } = await listBrands(
      { page, pageSize: PAGE, search: "", anyOf: "", columnFilters: {}, sort: { id: "name", direction: "asc" } },
      undefined,
      archived,
    );
    out.push(...rows);
    if (rows.length === 0 || out.length >= total) return out;
  }
}

export async function listBrandRows(archived: ArchivedFilter): Promise<BrandBrowseRow[]> {
  const [claims, orgs, brands] = await Promise.all([
    getClaimsUser(supabase),
    readMemberOrganizationRows(),
    readEveryBrand(archived),
  ]);
  if (claims.error) {
    throw new Error(`We could not verify your sign-in just now (${claims.error.message}). Try again.`);
  }
  if (!orgs.ok) {
    throw new Error(`We could not read your organizations just now (${orgs.error.message}), so this list cannot tell yours from others'. Try again.`);
  }
  const userId = claims.data?.user?.id ?? null;
  return brands.map((b) => ({
    ...b,
    is_mine: userId != null && b.created_by === userId,
    in_my_orgs: b.organization_id != null && orgs.roleByOrgId.has(b.organization_id),
    is_public: Boolean(b.published_to_web),
    archived: b.deleted_at != null,
  }));
}

const FIELDS: MemoryServiceOptions<BrandBrowseRow>["fields"] = {
  name: { value: (r) => r.name, search: true },
  websites: { value: (r) => r.sites.map((s) => s.domain).join(" "), search: true },
  industry: { value: (r) => r.industry, search: true, facet: true },
  status: { value: (r) => r.status, facet: true },
  social_count: { value: (r) => r.social_count },
  asset_count: { value: (r) => r.asset_count },
  fact_count: { value: (r) => r.fact_count },
  pending_discovered: { value: (r) => r.pending_discovered },
  updated_at: { value: (r) => r.updated_at },
  created_at: { value: (r) => r.created_at },
};

/** Exported for tests. */
export function inLane(row: BrandBrowseRow, lane: BrandLane): boolean {
  if (lane === "mine") return row.is_mine;
  if (lane === "public") return row.is_public;
  if (lane === "orgs") return row.in_my_orgs;
  if (lane === "shared") return !row.is_mine && !row.in_my_orgs && !row.is_public;
  return row.is_mine || row.in_my_orgs || !row.is_public;
}

const SHARE_MS = 3000;
const sharedReads = new Set<Map<ArchivedFilter, Promise<BrandBrowseRow[]>>>();

/** A write on this page (archive, restore, create) makes the next list read fresh. */
export function forgetBrandListReads(): void {
  for (const reads of sharedReads) reads.clear();
}

export function createBrandListService(
  load: (archived: ArchivedFilter) => Promise<BrandBrowseRow[]> = listBrandRows,
): EntityListService<BrandBrowseRow> {
  // ONE read per Archived value per moment: page, counts, facets and the all-archived probe ask together.
  const inFlight = new Map<ArchivedFilter, Promise<BrandBrowseRow[]>>();
  sharedReads.add(inFlight);
  const shared = (archived: ArchivedFilter) => {
    let read = inFlight.get(archived);
    if (!read) {
      const mine = load(archived);
      read = mine;
      inFlight.set(archived, mine);
      const drop = () => {
        if (inFlight.get(archived) === mine) inFlight.delete(archived);
      };
      mine.then(() => setTimeout(drop, SHARE_MS), drop);
    }
    return read;
  };
  const laneOf = (query: EntityListQuery): BrandLane =>
    (BRAND_LIST_SCOPES as readonly string[]).includes(query.scope.kind) ? (query.scope.kind as BrandLane) : "all";
  const fresh = (archived: ArchivedFilter, lane: BrandLane) =>
    createMemoryListService<BrandBrowseRow>({
      load: async () => (await shared(archived)).filter((row) => inLane(row, lane)),
      fields: FIELDS,
      scope: lane,
      defaultSort: "name",
      organizationOf: (row) => row.organization_id,
    });
  return {
    fetchPage: (query, sort) => fresh(query.archived, laneOf(query)).fetchPage(query, sort),
    async fetchCounts(query): Promise<EntityScopeCounts> {
      const byKind: EntityScopeCounts["byKind"] = {};
      for (const lane of BRAND_LIST_SCOPES) {
        const counts = await fresh(query.archived, lane).fetchCounts(query);
        byKind[lane] = counts.byKind[lane] ?? 0;
      }
      return { byKind, narrow: {} };
    },
    fetchFacets: (query) => fresh(query.archived, laneOf(query)).fetchFacets(query),
  };
}
