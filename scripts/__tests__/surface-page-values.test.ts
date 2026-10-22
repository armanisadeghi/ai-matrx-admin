/**
 * check:surface-impact must judge bindings against PAGE values only. The four
 * table_row item values (row, row_id, shown, table_id) sit on every surface and
 * must not enter its value set: a mapping to a bare `row` is not a page value.
 */
import {
  pageValuesOnly,
  type SurfaceValueRow,
} from "@/scripts/lib/surface-page-values";

const rows: SurfaceValueRow[] = [
  { surface_name: "s", name: "content", value_type: "string", item_type: "" },
  { surface_name: "s", name: "legacy", value_type: "string", item_type: null },
  { surface_name: "s", name: "row", value_type: "object", item_type: "table_row" },
  { surface_name: "s", name: "row_id", value_type: "string", item_type: "table_row" },
];

describe("surface-impact page values", () => {
  it("drops table_row item values so a bare `row` mapping is not matched", () => {
    const names = new Set(pageValuesOnly(rows).map((r) => r.name));
    expect(names.has("row")).toBe(false);
    expect(names.has("row_id")).toBe(false);
  });
  it("keeps page values, including a null item_type", () => {
    expect(pageValuesOnly(rows).map((r) => r.name)).toEqual(["content", "legacy"]);
  });
});
