// A ROW'S COLOR IS THE TABLE'S TO PAINT (lane mac-default, 2026-10-19). A `bg-*` class from
// `rowClassName` lands on the <tr>, and the Mac look paints every cell opaque over it, so the
// highlight vanished. The table's own row tint (`tableStyle.style.rows`) draws in every look.
import {
  TABLE_STYLE_VERSION,
  type MatrxDataTableStyleConfig,
  type StyleColor,
} from "@ai-matrx/design-system/data-table";

/** The row ids → color map as the table's style config; undefined when nothing is tinted. */
export function rowTintStyle<T>(
  rows: Record<string, StyleColor>,
): MatrxDataTableStyleConfig<T> | undefined {
  return Object.keys(rows).length > 0
    ? { style: { version: TABLE_STYLE_VERSION, rows } }
    : undefined;
}

/** One row tinted (the open / focused / selected one), or none. */
export function oneRowTint<T>(
  id: string | null | undefined,
  color: StyleColor = "blue",
): MatrxDataTableStyleConfig<T> | undefined {
  return id ? rowTintStyle<T>({ [id]: color }) : undefined;
}

/** Every row `tintOf` names a color for. */
export function rowTintsWhere<T>(
  data: readonly T[],
  idOf: (row: T) => string,
  tintOf: (row: T) => StyleColor | null | undefined | false,
): MatrxDataTableStyleConfig<T> | undefined {
  const rows: Record<string, StyleColor> = {};
  for (const row of data) {
    const color = tintOf(row);
    if (color) rows[idOf(row)] = color;
  }
  return rowTintStyle<T>(rows);
}
