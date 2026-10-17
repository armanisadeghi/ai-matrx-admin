import { dateFilterBounds } from "@ai-matrx/design-system/data-table/date-filter";
import type { MatrxDataTableQueryState } from "@ai-matrx/design-system/data-table/types";

/**
 * A `date` column filter as bounds: `since` inclusive, `until` exclusive (ISO instants). A relative
 * preset ("Last hour", "Today") resolves through the table's own `dateFilterBounds`, so the server
 * applies exactly the range the person picked. The one place marketing query owners read it.
 */
export function dateFilter(
  state: MatrxDataTableQueryState,
  column: string,
): { since?: string; until?: string } | null {
  const filter = state.columnFilters[column];
  return filter?.kind === "date" ? dateFilterBounds(filter) : null;
}

/** Narrow a PostgREST builder by the `date` filter held under `filterId`, on DB column `dbColumn`. */
export function applyDateFilter<
  Q extends { gte(column: string, value: string): Q; lt(column: string, value: string): Q },
>(query: Q, state: MatrxDataTableQueryState, filterId: string, dbColumn = filterId): Q {
  const range = dateFilter(state, filterId);
  let next = query;
  if (range?.since) next = next.gte(dbColumn, range.since);
  if (range?.until) next = next.lt(dbColumn, range.until);
  return next;
}
