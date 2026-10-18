// features/esign/dateWindow.ts — the table's date-range filters, applied to rows the browser already holds.
// `query.filters` is keyed by column id; a date entry carries its bounds already resolved
// (`since` inclusive, `until` exclusive). A row with no moment is in no window (same as
// platform.list_date_filter_ok).
import type { EntityListQuery } from "@/lib/entity-list/types";

/** `moments` maps a column id to the row's ISO moment for it (null when the row has none). */
export function inDateWindows<T>(
  row: T,
  query: EntityListQuery,
  moments: Record<string, (row: T) => string | null | undefined>,
): boolean {
  for (const [id, read] of Object.entries(moments)) {
    const filter = query.filters[id];
    if (!filter || filter.kind !== "date") continue;
    const raw = read(row);
    const at = raw ? new Date(raw).getTime() : NaN;
    if (Number.isNaN(at)) return false;
    if (filter.since && at < new Date(filter.since).getTime()) return false;
    if (filter.until && at >= new Date(filter.until).getTime()) return false;
  }
  return true;
}
