// CD-VIEW-11 (Notion's view settings on a Spaces database block over a custom table): a board can be
// sub-grouped by a second property (records-ui's swimlanes), and every view sets how many rows it loads at
// first (Notion's "Load limit": 10, 25, 50, 100). Red before: viewSpec dropped both and the block always
// read the grid's default page.
import type { Field } from "@ai-matrx/records/react";

import { LOAD_LIMITS, blockPageSize, viewSpec } from "../view-spec";

const fields = [{ id: "F-NAME", key: "name", label: "Name", type: "text" }, { id: "F-ST", key: "status", label: "Status", type: "select" }, { id: "F-OWN", key: "owner", label: "Owner", type: "text" }] as unknown as Field[];

describe("a board sub-groups and a view sets its load limit", () => {
  it("hands the board's sub-group to records-ui as its swimlanes", () => {
    const spec = viewSpec("T1", { id: "v1", name: "Board", layout: "kanban", groupField: "status", subGroupField: "owner" }, fields);
    expect(spec.groupField).toBe("status");
    expect(spec.swimlaneField).toBe("owner");
    expect(viewSpec("T1", { id: "v2", name: "Board", layout: "kanban", groupField: "status" }, fields).swimlaneField ?? null).toBeNull();
  });
  it("a sub-group belongs to a board only", () => {
    expect(viewSpec("T1", { id: "v3", name: "Table", layout: "grid", subGroupField: "owner" }, fields).swimlaneField ?? null).toBeNull();
  });
  it("offers Notion's four load limits, and reads the view's own or the default", () => {
    expect(LOAD_LIMITS).toEqual([10, 25, 50, 100]);
    expect(blockPageSize({ loadLimit: 10 })).toBe(10);
    expect(blockPageSize({ loadLimit: 100 })).toBe(100);
    expect(blockPageSize({})).toBeUndefined();
    expect(blockPageSize({ loadLimit: 7 })).toBeUndefined();
  });
});
