/**
 * Moved to `@ai-matrx/records/list` (P16). This path re-exports the package so existing
 * app imports keep resolving to the ONE implementation.
 */
import {
  DEFAULT_ENTITY_LIST_QUERY as PACKAGE_DEFAULT_QUERY,
  countActiveFilters as packageCountActiveFilters,
  type ArchivedFilter,
  type EntityFilterValue as PackageFilterValue,
  type EntityListQuery as PackageListQuery,
} from "@ai-matrx/records/list";
import type { DateFilterBounds, TimeRangePreset } from "@ai-matrx/design-system/data-table/date-filter";

export {
  EMPTY_FACETS,
  EMPTY_SCOPE_COUNTS,
  NONE_VALUE,
  facetCount,
  facetValues,
  scopeCountsFromRows,
} from "@ai-matrx/records/list";
export type {
  ArchivedFilter,
  ArchivedProbe,
  EntityFacets,
  EntityListPage,
  EntityListSort,
  EntityScopeCounts,
  ScopeCountRow,
  ScopeNarrowOption,
} from "@ai-matrx/records/list";

/**
 * A DATE RANGE in the filter bag (table-drill-down rules 10–11), keyed by column id like every
 * other entry. The table's `date` filter lands here as-is (preset + anchor, for the header to show)
 * WITH its bounds resolved by `dateFilterBounds` — `since` inclusive, `until` exclusive — so every
 * scoped list RPC reads plain instants (`platform.list_date_filter_ok(p_filters, '<column id>', value)`)
 * and never resolves a preset itself. Spelled here until `@ai-matrx/records/list` carries the kind.
 */
export interface EntityDateFilterValue extends DateFilterBounds {
  kind: "date";
  preset?: TimeRangePreset;
  anchor?: string;
}
export type EntityFilterValue = PackageFilterValue | EntityDateFilterValue;
/** Keyed by COLUMN ID, so the server predicate and the header agree by name. */
export type EntityFilters = Record<string, EntityFilterValue>;
export type EntityListQuery = Omit<PackageListQuery, "filters"> & { filters: EntityFilters };

export const DEFAULT_ENTITY_LIST_QUERY: EntityListQuery = PACKAGE_DEFAULT_QUERY;

/** The package's Filters-badge count, over this app's wider filter bag (it reads only the keys). */
export function countActiveFilters(
  query: EntityListQuery,
  defaultArchived?: ArchivedFilter,
): number {
  return (
    packageCountActiveFilters({ ...query, filters: {} }, defaultArchived) +
    Object.keys(query.filters).length
  );
}
