// The block grid asks its view's `where` (records-ui ViewSwitcher reads only the `filter` it is handed): a saved
// where ANDed with the "is" filters by field id; the filters alone when there is no where.
import type { Field } from "@ai-matrx/records/react";

import { blockQuestion } from "../view-spec";

const fields = [{ id: "F-ST", key: "status" }, { id: "F-DUE", key: "due_on" }] as unknown as Field[];
const within = { op: "and", args: [{ op: "within", args: [{ field: "F-DUE" }, { const: { relative: "this_week" } }] }] };

describe("blockQuestion", () => {
  it("asks the where", () => {
    expect(blockQuestion({ where: within }, fields)).toEqual(within);
  });
  it("ands the where with the is-filters by field id", () => {
    expect(blockQuestion({ where: within, filters: { status: "Done", due_on: null } }, fields)).toEqual({
      op: "and",
      args: [within, { op: "eq", args: [{ field: "F-ST" }, { const: "Done" }] }, { op: "is_empty", args: [{ field: "F-DUE" }] }],
    });
  });
  it("keeps the flat filters alone, and nothing for no question", () => {
    expect(blockQuestion({ filters: { status: "Done" } }, fields)).toEqual({ status: "Done" });
    expect(blockQuestion({}, fields)).toBeUndefined();
  });
});
