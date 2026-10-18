// @jest-environment node
// Lane SKELETON-HEIGHT (2026-10-17): the box a streamed database block draws is the height its frame will have.
// The numbers are the ones measured on a live Fundraising CRM page: a grid with 3 rows is a 303.5 px frame
// (title 34 + bar 32 + body 203.5 + 8 + 26), with 9 rows 525.5 px (a grid's title row hidden: 4 px less gap).
jest.mock("server-only", () => ({}));

import { databaseFramePx } from "../database-loading-box";
import { columnCardsOf, rowsVisibleOf } from "../../page/space-page-seed.server";

const grid = (extra: Record<string, unknown> = {}) => ({ source: { kind: "table", tableId: "t" }, views: [{ id: "v", name: "Table", layout: "grid" }], activeViewId: "v", ...extra });

describe("databaseFramePx", () => {
  it("is the measured frame height for a titled grid", () => {
    expect(databaseFramePx(grid(), 3)).toBe(303.5);
    expect(databaseFramePx(grid(), 9)).toBe(525.5);
  });
  it("stops at the embedded page size (50 rows) however many the table has", () => {
    expect(databaseFramePx(grid(), 200)).toBe(databaseFramePx(grid(), 50));
  });
  it("is one gap shorter without a title", () => {
    expect(databaseFramePx(grid({ showTitle: false }), 3)).toBe(303.5 - 34 - 4);
  });
  it("knows nothing for an empty table, an unknown count or another layout", () => {
    expect(databaseFramePx(grid(), 0)).toBeNull();
    expect(databaseFramePx(grid(), null)).toBeNull();
    expect(databaseFramePx(grid({ views: [{ id: "v", name: "Board", layout: "kanban" }] }), 5)).toBeNull();
  });
});

describe("rowsVisibleOf", () => {
  it("reads rows_visible from a where answer", () => {
    expect(rowsVisibleOf({ data: { kind: "table", rows_visible: 4 }, error: null })).toBe(4);
  });
  it("is null for an error, an old door or a bad value", () => {
    expect(rowsVisibleOf({ data: { kind: "table" }, error: null })).toBeNull();
    expect(rowsVisibleOf({ data: { rows_visible: "4" }, error: null })).toBeNull();
    expect(rowsVisibleOf({ data: null, error: { code: "x" } })).toBeNull();
  });
});

// Lane SKELETON-HEIGHT-2: a board block's columns, from the table's opening board.
describe("columnCardsOf", () => {
  const where = (opening_view: unknown) => ({ data: { kind: "table", opening_view }, error: null });
  const board = { layout: "kanban", groupField: "stage" };
  it("is the opening board's cards per column when the block's open view is that board", () => {
    expect(columnCardsOf(where({ layout: "kanban", group_field: "stage", groups: [6, 6, 1], cap: 200 }), board)).toEqual([6, 6, 1]);
  });
  it("is nothing for another layout, another grouping Field, no groups or an error", () => {
    const open = { layout: "kanban", group_field: "stage", groups: [2], cap: 200 };
    expect(columnCardsOf(where(open), { layout: "grid" })).toBeNull();
    expect(columnCardsOf(where(open), { layout: "kanban", groupField: "owner" })).toBeNull();
    expect(columnCardsOf(where(open), { layout: "kanban" })).toBeNull();
    expect(columnCardsOf(where({ layout: "grid", cap: 200 }), board)).toBeNull();
    expect(columnCardsOf(where({ layout: "kanban", group_field: "stage", groups: [], cap: 200 }), board)).toBeNull();
    expect(columnCardsOf(where({ layout: "kanban", group_field: "stage", groups: [1, "x"], cap: 200 }), board)).toBeNull();
    expect(columnCardsOf({ data: null, error: { message: "x" } as never }, board)).toBeNull();
  });
});
