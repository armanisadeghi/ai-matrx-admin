// CD-VIEW-11 ("A Spaces database block offers every layout and view setting a table has ... including for
// built-in sources"): a block over Tasks / Projects / Deals / Employees offers Gallery and List beside Table,
// Board and Chart, keeps a card size on its gallery, and reads its own load limit (10, 25, 50, 100) — the
// first page and every "Load more". Red before: a built-in source offered Table / Board / Chart only and
// always read 50 rows.
import type { EntityColumn } from "@ai-matrx/records-ui";

import { ENTITY_LAYOUT_IDS, entityCardColumns, entityPageSize, entitySettingsFor } from "../entity-views";

const columns = [
  { api_name: "title", name: "Title", type: "text" },
  { api_name: "status", name: "Status", type: "choice", choices: ["Open", "Done"] },
  { api_name: "due", name: "Due", type: "date" },
  { api_name: "owner_id", name: "Owner", type: "uuid" },
  { api_name: "notes", name: "Notes", type: "text" },
  { api_name: "points", name: "Points", type: "number" },
  { api_name: "area", name: "Area", type: "text" },
] as unknown as EntityColumn[];

describe("a built-in source offers gallery, list, card size and load limit", () => {
  it("offers Table, Board, Gallery, List and Chart", () => {
    expect(ENTITY_LAYOUT_IDS).toEqual(["grid", "kanban", "gallery", "list", "chart"]);
  });
  it("reads the view's own load limit, else 50", () => {
    expect(entityPageSize({ loadLimit: 10 })).toBe(10);
    expect(entityPageSize({ loadLimit: 100 })).toBe(100);
    expect(entityPageSize({})).toBe(50);
    expect(entityPageSize({ loadLimit: 7 })).toBe(50);
  });
  it("a card shows the title, then the first shown properties (never a bare id), at most four", () => {
    const title = columns[0];
    expect(entityCardColumns(columns, [], title).map((c) => c.api_name)).toEqual(["status", "due", "notes", "points"]);
    expect(entityCardColumns(columns, ["status"], title).map((c) => c.api_name)).toEqual(["due", "notes", "points", "area"]);
  });
  it("offers card size on the gallery and load limit on every layout that lists rows", () => {
    expect(entitySettingsFor("gallery")).toEqual({ cardSize: true, loadLimit: true });
    expect(entitySettingsFor("list")).toEqual({ cardSize: false, loadLimit: true });
    expect(entitySettingsFor("grid")).toEqual({ cardSize: false, loadLimit: true });
    expect(entitySettingsFor("chart")).toEqual({ cardSize: false, loadLimit: false });
  });
});
