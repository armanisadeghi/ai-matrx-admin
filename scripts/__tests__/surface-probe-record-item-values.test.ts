// scripts/__tests__/surface-probe-record-item-values.test.ts
//
// Item values are not page values. `ui.ui_surface_value` holds both: page values
// (item_type '') and the values of an ITEM a person points at (item_type 'table_row':
// table_id, row_id, shown, row). @ai-matrx/alchemy declares the table-row item as a
// BASELINE item type, so ~280 surfaces carry it by design, all always_available — they
// are available once a row is clicked, never from the page itself.
//
// 2026-10-22: the probe recorder read every value row in the chain as a page value, so
// every recorded probe failed on four "always-available values not supplied" that no
// page supplies (22 of 25 recorded probes failed on those four alone). This test drives
// the real verdict with the real chain row shape and fails if item values count again.

import { CHAIN_SQL, judgeProbe, type ChainValue, type ProbeRecordInput } from "../lib/surface-probe-judge";

const TABLE_ROW_VALUES: ChainValue[] = ["table_id", "row_id", "shown", "row"].map((name) => ({
  name,
  label: name,
  always_available: true,
  auto_context: true,
  item_type: "table_row",
}));

function input(supplied: string[]): ProbeRecordInput {
  return {
    surface: "matrx-user/images",
    route: "/images",
    recordId: null,
    base: "http://localhost:3000",
    supplied,
    suppliedEmpty: [],
    surfaceNamed: true,
    signedIn: true,
    probedAs: { email: "admin@admin.com", userId: null, role: "admin" },
    errors: [],
  };
}

describe("surface-probe-record: item values are not page values", () => {
  it("passes a page that supplied every page value, though the surface also declares table-row item values", () => {
    const chain: ChainValue[] = [
      { name: "selection", label: "Selection", always_available: true, auto_context: true, item_type: "" },
      ...TABLE_ROW_VALUES,
    ];
    const probe = judgeProbe(input(["selection"]), chain, "2026-10-22T00:00:00Z");
    expect(probe.missing).toEqual([]);
    expect(probe.required).toEqual(["selection"]);
    expect(probe.declaredOn).toEqual(["selection"]);
    expect(probe.status).toBe("pass");
  });

  it("still fails when a real page value is missing", () => {
    const chain: ChainValue[] = [
      { name: "selection", label: "Selection", always_available: true, auto_context: true, item_type: "" },
      { name: "view_mode", label: "View mode", always_available: true, auto_context: true, item_type: "" },
      ...TABLE_ROW_VALUES,
    ];
    // The page loaded and supplied one value (a page that supplied NOTHING is inconclusive,
    // scripts/__tests__/surface-probe-inconclusive.test.ts).
    const probe = judgeProbe(input(["view_mode"]), chain, "2026-10-22T00:00:00Z");
    expect(probe.missing).toEqual(["selection"]);
    expect(probe.status).toBe("fail");
  });

  it("the chain query reads only page values, and keys by item type so an item value never shadows a page value", () => {
    expect(CHAIN_SQL).toMatch(/v\.item_type\s*=\s*''/);
    expect(CHAIN_SQL).toMatch(/v\.item_type/);
  });
});
