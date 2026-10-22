/**
 * Page values vs item values on ui.ui_surface_value.
 *
 * item_type = '' rows are the page's own values (what a manifest declares and
 * what bindings can target). item_type = 'table_row' rows (row, row_id, shown,
 * table_id) are item values alchemy puts on every surface for right-clicking a
 * table row; they are never page values, so impact checks must not count them.
 */
export interface SurfaceValueRow {
  surface_name: string;
  name: string;
  value_type: string | null;
  item_type?: string | null;
}

export const isPageValue = (v: Pick<SurfaceValueRow, "item_type">): boolean =>
  (v.item_type ?? "") === "";

export const pageValuesOnly = <T extends Pick<SurfaceValueRow, "item_type">>(
  rows: readonly T[],
): T[] => rows.filter(isPageValue);
