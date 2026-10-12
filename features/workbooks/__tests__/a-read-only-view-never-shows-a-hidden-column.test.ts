/**
 * Hidden columns stay hidden on every read-only view: the share page, CSV, print and PDF read the
 * sheet through univerSnapshotToRows({ skipHidden: true }). A linked table's hidden Record ID column
 * (raw UUIDs) must never reach a reader; the editor/import path (no flag) still sees every column.
 */
import { RECORD_ID_HEADER, buildLinkedWorkbook, linkedFieldFor, type LinkedField } from "../table-link/link-model";
import { univerSnapshotToRows } from "../univer-snapshot-rows";

const FIELDS: LinkedField[] = [linkedFieldFor({ field_name: "company", display_name: "Company", data_type: "string", metadata: {} } as Parameters<typeof linkedFieldFor>[0])];
const snapshot = buildLinkedWorkbook(
  { name: "Pipeline", fields: FIELDS, rows: [{ id: "6f1c2a9e-0000-4000-8000-000000000001", data: { company: "Harbor Dental" } }], display: {} },
  { workbookId: "wb-1", sheetId: "sheet-1" },
);

describe("hidden columns on read-only views", () => {
  it("skipHidden drops the Record ID column and its UUIDs", () => {
    const grid = univerSnapshotToRows(snapshot, { sheetId: "sheet-1", skipHidden: true })!;
    expect(grid.rows[0]).toEqual(["Company"]);
    expect(JSON.stringify(grid.rows)).not.toContain("6f1c2a9e");
  });
  it("without the flag the editor path still sees it", () => {
    const grid = univerSnapshotToRows(snapshot, { sheetId: "sheet-1" })!;
    expect(grid.rows[0]).toEqual(["Company", RECORD_ID_HEADER]);
  });
});
