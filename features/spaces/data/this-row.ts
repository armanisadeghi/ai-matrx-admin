// features/spaces/data/this-row.ts — "This page's row": the view filter that narrows a database block to
// the rows related to the row whose page it sits on (Notion's "Client contains This page").
//
// Stored: a view filter value `THIS_ROW` on a relation column, saved like any other filter. Resolved ONLY
// here, at render, into the owning row's id (`content.space_owning_row` — the page's row, or the row of a
// page above it). The token never reaches the store: a block that cannot resolve it shows NO rows, never
// every row. The store reads a scalar on a relation column as "contains" (custom.record_filter_sql), so
// one-to-many and many-to-many relations both narrow the same way.
// Plan: common-docs/systems/data/custom-data/projects/row-pages/PLAN.md.

import type { SpaceDbView } from "./sources";

/** The filter value that means "the row this page belongs to". */
export const THIS_ROW = "@this-row";

/** The words a filter chip and menu use for the token. */
export const THIS_ROW_LABEL = "This page's row";

type Filters = NonNullable<SpaceDbView["filters"]>;

/** Does this view filter to the page's own row anywhere? */
export function usesThisRow(filters: SpaceDbView["filters"]): boolean {
  return Object.values(filters ?? {}).some((v) => v === THIS_ROW);
}

/** The relation column keys a view narrows by "this page's row". */
export function thisRowKeys(filters: SpaceDbView["filters"]): string[] {
  return Object.entries(filters ?? {})
    .filter(([, v]) => v === THIS_ROW)
    .map(([k]) => k);
}

export type ResolvedFilters = { state: "plain"; filters: Filters } | { state: "resolved"; filters: Filters } | { state: "waiting" } | { state: "no-row" };

/**
 * The filters the store is asked with. `owner` is the page's row id: `undefined` while it is being read,
 * `null` when the page belongs to no row. A view without the token passes through untouched.
 */
export function resolveThisRow(filters: SpaceDbView["filters"], owner: string | null | undefined): ResolvedFilters {
  const given = filters ?? {};
  if (!usesThisRow(given)) return { state: "plain", filters: given };
  if (owner === undefined) return { state: "waiting" };
  if (owner === null) return { state: "no-row" };
  const out: Filters = {};
  for (const [k, v] of Object.entries(given)) out[k] = v === THIS_ROW ? owner : v;
  return { state: "resolved", filters: out };
}

/** The values a row added in this view starts with: linked to the page's row (Notion fills the filter). */
export function thisRowValues(filters: SpaceDbView["filters"], owner: string | null | undefined): Record<string, string[]> {
  if (!owner) return {};
  const out: Record<string, string[]> = {};
  for (const key of thisRowKeys(filters)) out[key] = [owner];
  return out;
}
