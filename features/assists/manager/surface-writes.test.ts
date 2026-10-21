import { assistViewPatch, nextAssistTableState, parseAssistUpdates } from "./surface-writes";
import type { MatrxDataTableQueryState } from "@ai-matrx/design-system/data-table/types";

const state: MatrxDataTableQueryState = { page: 4, pageSize: 25, search: "old", anyOf: "", columnFilters: {}, sort: null };

describe("assist surface controls", () => {
  it("refuses execution, unknown preferences and empty writes", () => {
    expect(() => assistViewPatch.parse({ execute: true })).toThrow();
    expect(() => assistViewPatch.parse({})).toThrow();
    expect(() => assistViewPatch.parse({ urgency: "invented" })).toThrow();
  });
  it("resets pagination for a changed filter while retaining other table settings", () => {
    const next = nextAssistTableState(state, assistViewPatch.parse({ starred_only: true, search: "new" }));
    expect(next).toMatchObject({ search: "new", page: 1, pageSize: 25 });
    expect(state.search).toBe("old");
    expect(nextAssistTableState(state, assistViewPatch.parse({ page: 2 })).page).toBe(2);
  });
  it("uses the canonical column-filter shape and preserves unrelated filters", () => {
    const next = nextAssistTableState(state, assistViewPatch.parse({ source_key: "notes", source_kind: "agent", surface_name: "matrx-user/notes" }));
    expect(next.columnFilters).toEqual({ sourceKey: { kind: "text", value: "notes" }, sourceKind: { kind: "select", value: "agent" }, surfaceName: { kind: "text", value: "matrx-user/notes" } });
    expect(nextAssistTableState(next, assistViewPatch.parse({ source_key: null })).columnFilters.sourceKey).toBeUndefined();
  });
  it("refuses row mutation before a successful current read or for an unknown row", () => {
    expect(() => parseAssistUpdates([], [], false)).toThrow("Wait for the current assist view");
    expect(() => parseAssistUpdates([{ id: "50ea4f94-ebc6-4131-9d66-e030806a101d", starred: true }], [], true)).toThrow("not in the loaded page");
  });
  it("accepts a known row's flag update and refuses duplicate plans and snoozing a decided row", () => {
    const row = { id: "50ea4f94-ebc6-4131-9d66-e030806a101d", title: "Known", status: "dismissed" as const };
    expect(parseAssistUpdates([{ id: row.id, starred: true }], [row], true)).toEqual([{ id: row.id, starred: true, title: "Known" }]);
    expect(() => parseAssistUpdates([{ id: row.id, starred: true }, { id: row.id, starred: false }], [row], true)).toThrow();
    expect(() => parseAssistUpdates([{ id: row.id, snooze: "1d" }], [row], true)).toThrow("not pending");
  });
  it("refuses a destructive status mixed with snooze before any mutation", () => {
    expect(() => parseAssistUpdates([{ id: "50ea4f94-ebc6-4131-9d66-e030806a101d", status: "dismissed", snooze: "1d" }], [], true)).toThrow("status or snooze");
  });
});
