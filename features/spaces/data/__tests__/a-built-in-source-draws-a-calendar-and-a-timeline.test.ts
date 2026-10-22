// CD-VIEW-11 ("A Spaces database block offers every layout and view setting a table has ... including for
// built-in sources"): a block over Tasks / Projects / Deals / Employees draws its board from the block's own
// rows (so the view's filter holds on the board — it read the module unfiltered) with Notion's Sub-group, and
// offers Calendar and Timeline beside Table, Board, Gallery, List and Chart, in the custom table's order, and
// draws them with records-ui's ONE
// calendar and ONE timeline: the module's columns in the store's Field shape (a date is a range of kind date
// or datetime), its rows as read rows that open on a click and never drag-write a module row. The view draws
// by its own date property while the source has it, else the first date. Red before: a built-in source
// offered Table / Board / Gallery / List / Chart only, no date setting and no sub-group.
import type { EntityColumn, EntityRow } from "@ai-matrx/records-ui";

import { ENTITY_LAYOUT_IDS, entityBoardColumn, entityBoardRows, entityChoiceColumnsOf, entityDateColumns, entityDateFor, entityField, entityReadRows, entitySettingsFor, entitySubGroups } from "../entity-views";
import { LAYOUTS } from "../view-icons";

const columns = [
  { api_name: "title", name: "Title", type: "text" },
  { api_name: "status", name: "Status", type: "choice", choices: ["Open", "Done"], writable: true },
  { api_name: "priority", name: "Priority", type: "choice", choices: ["High", "Low"], writable: true },
  { api_name: "stage_id", name: "Stage", type: "choice", choices: ["New", "Won"], writable: true, lookup: { via: "stage_id", token: "category", column: "name", replaces: true } },
  { api_name: "due_date", name: "Due", type: "date" },
  { api_name: "started_at", name: "Started", type: "timestamp" },
  { api_name: "project_due", name: "Project due", type: "date", lookup: { via: "project_id", token: "project", column: "due_date", replaces: false } },
  { api_name: "points", name: "Points", type: "number" },
] as unknown as EntityColumn[];

describe("a built-in source draws a calendar and a timeline", () => {
  it("offers Calendar and Timeline, in the order a custom table's layout menu lists them", () => {
    expect(ENTITY_LAYOUT_IDS).toEqual(["grid", "kanban", "gallery", "list", "calendar", "timeline", "chart"]);
    const customOrder = LAYOUTS.map((l) => l.id).filter((id) => (ENTITY_LAYOUT_IDS as readonly string[]).includes(id));
    expect(customOrder).toEqual([...ENTITY_LAYOUT_IDS]);
  });

  it("a calendar and a timeline take a date setting and a load limit; the others take no date", () => {
    expect(entitySettingsFor("calendar")).toEqual({ cardSize: false, loadLimit: true, date: true, subGroup: false });
    expect(entitySettingsFor("timeline")).toEqual({ cardSize: false, loadLimit: true, date: true, subGroup: false });
    expect(entitySettingsFor("grid").date).toBe(false);
    expect(entitySettingsFor("gallery").date).toBe(false);
  });

  it("a board takes a sub-group, and only a board", () => {
    expect(entitySettingsFor("kanban").subGroup).toBe(true);
    expect(entitySettingsFor("grid").subGroup).toBe(false);
    expect(entitySettingsFor("calendar").subGroup).toBe(false);
  });

  it("a board groups and sub-groups by the module's choice properties, moving a card only where the peek may write", () => {
    expect(entityChoiceColumnsOf(columns).map((c) => c.api_name)).toEqual(["status", "priority", "stage_id"]);
    expect(entityBoardColumn(columns[1]!)).toMatchObject({ key: "status", label: "Status", type: "choice", choices: ["Open", "Done"], readOnly: false });
    // A lookup's word is shown, never written from a card (the peek writes a module's own columns only).
    expect(entityBoardColumn(columns[3]!).readOnly).toBe(true);
    expect(entityBoardColumn(columns[0]!).readOnly).toBe(true);
  });

  it("a board row carries its id and version, and a held move lays over it until the rows are read again", () => {
    const rows = [{ id: "r1", title: "Call the venue", status: "Open", version: 3, organization_id: "o1" }] as EntityRow[];
    expect(entityBoardRows(rows)[0]).toMatchObject({ _id: "r1", _version: 3, _organization_id: "o1", status: "Open", title: "Call the venue" });
    expect(entityBoardRows(rows, { r1: { status: "Done" } })[0]).toMatchObject({ _id: "r1", status: "Done" });
  });

  it("Sub-group cuts the rows into one band per choice, in the property's order, then the rows without one", () => {
    const rows = [
      { id: "a", title: "A", priority: "Low" },
      { id: "b", title: "B", priority: "High" },
      { id: "c", title: "C", priority: null },
      { id: "d", title: "D", priority: "High" },
    ] as unknown as EntityRow[];
    const bands = entitySubGroups(rows, columns[2]!);
    expect(bands.map((b) => [b.key, b.label, b.rows.map((r) => r.id)])).toEqual([
      ["High", "High", ["b", "d"]],
      ["Low", "Low", ["a"]],
      ["", "No priority", ["c"]],
    ]);
    // A choice no row holds draws no band.
    expect(entitySubGroups([rows[0]!], columns[2]!).map((b) => b.key)).toEqual(["Low"]);
  });

  it("offers the module's own date columns (a day or an instant), never a lookup's", () => {
    expect(entityDateColumns(columns).map((c) => c.api_name)).toEqual(["due_date", "started_at"]);
  });

  it("draws by the view's date while the source has it, else the first date, else none", () => {
    expect(entityDateFor({ dateField: "started_at" }, columns)?.api_name).toBe("started_at");
    expect(entityDateFor({ dateField: "gone" }, columns)?.api_name).toBe("due_date");
    expect(entityDateFor({}, columns)?.api_name).toBe("due_date");
    expect(entityDateFor({}, [columns[0]!])).toBeNull();
  });

  it("a module column is a store Field: a day is a range of kind date, an instant of kind datetime, a number a range", () => {
    const [title, status, , , due, started, , points] = columns.map(entityField);
    expect([title!.key, title!.label, title!.type]).toEqual(["title", "Title", "text"]);
    expect(status!.type).toBe("text");
    expect([due!.type, due!.config]).toEqual(["range", { kind: "date" }]);
    expect([started!.type, started!.config]).toEqual(["range", { kind: "datetime" }]);
    expect(points!.type).toBe("range");
    expect(new Set(columns.map((c, i) => entityField(c, i).id)).size).toBe(columns.length);
  });

  it("a module row is a read row that opens but never drags (the peek writes through the module's door)", () => {
    const rows = [{ id: "r1", title: "Call the venue", due_date: "2026-10-23" }] as EntityRow[];
    const [row] = entityReadRows(rows);
    expect(row).toEqual({ id: "r1", document: { id: "r1", title: "Call the venue", due_date: "2026-10-23" }, level: "viewer", hidden: {} });
  });
});
