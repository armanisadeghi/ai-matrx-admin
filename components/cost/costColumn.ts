import { createElement } from "react";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import { Cost } from "./Cost";
import type { CostDisplay } from "./useCostDisplay";

/**
 * THE PER-ROW COST COLUMN (lane core, 2026-10-17). One column whose cell is the platform `<Cost>`:
 * points for every member, dollars only for a system admin who flipped the switch. The column's
 * value is the number the viewer SEES (points, or dollars), so sorting, filtering and copying read
 * exactly what is on screen; an unpriced row is blank, never a confident zero.
 *
 * Pass the page's `useCostDisplay()` — the unit and rate live in the store, never in the column.
 */
export function costColumn<T>({
  id,
  usd,
  display,
  header = "Cost",
  prefix,
  mobileHidden,
}: {
  id: string;
  usd: (row: T) => number | null | undefined;
  display: Pick<CostDisplay, "unit" | "format" | "toPoints">;
  header?: string;
  /** `"~"` for an estimate. */
  prefix?: string;
  mobileHidden?: boolean;
}): MatrxColumnDef<T> {
  const shown = (row: T): number | null => {
    const value = usd(row);
    if (typeof value !== "number" || !Number.isFinite(value)) return null;
    return display.unit === "usd" ? value : display.toPoints(value);
  };
  return {
    id,
    header,
    accessorFn: shown,
    format: { id: display.unit === "usd" ? "currency" : "integer" },
    filter: "number",
    defaultSortDirection: "desc",
    align: "right",
    compact: true,
    width: 110,
    ...(mobileHidden === undefined ? {} : { mobileHidden }),
    copyValue: (row) => {
      const value = usd(row);
      return typeof value === "number" && Number.isFinite(value) ? `${prefix ?? ""}${display.format(value, { short: true })}` : "";
    },
    cell: (row) => createElement(Cost, { usd: usd(row), short: true, ...(prefix ? { prefix } : {}) }),
  };
}
