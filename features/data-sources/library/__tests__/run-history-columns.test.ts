// Review I7: the Past runs list reads 50 jobs; their `metadata` (kept records, changes, 44 KB a row) must
// never ride along. A run's keys are read for the run on view only (useRunRowKeys), and the scope helper
// says honestly which rows the grid may show.
import { JOB_COLUMNS, runRowFilter, runScope } from "../runHistory";

jest.mock("@/utils/supabase/client", () => ({ createClient: jest.fn() }));
jest.mock("../../server", () => ({ getJobRowKeys: jest.fn() }));
jest.mock("../hooks", () => ({ useLibraryOrganizationId: () => "org-1" }));

test("the list columns never select the whole metadata document", () => {
  const cols = JOB_COLUMNS.split(",").map((c) => c.trim());
  expect(cols).not.toContain("metadata");
  expect(cols).toContain("row_key_field:metadata->>row_key_field");
});

test("a run is narrowed only when its key field and keys are known", () => {
  expect(runRowFilter({ row_key_field: "place_id" }, ["a", "b"])).toEqual({ place_id: ["a", "b"] });
  expect(runRowFilter({ row_key_field: null }, ["a"])).toBeNull();
  expect(runRowFilter({ row_key_field: "place_id" }, [])).toBeNull();
});

test("scope: this run, rows still coming, or honestly all rows", () => {
  const done = { status: "done", key_column: "Place Id", row_key_field: "place_id" };
  expect(runScope(done, ["a"])).toBe("this-run");
  expect(runScope({ ...done, status: "storing" }, [])).toBe("coming");
  expect(runScope(done, [])).toBe("all-rows");
  expect(runScope({ ...done, row_key_field: null }, [])).toBe("all-rows");
});
