/**
 * The share page draws a workbook as a spreadsheet, not a string table: formats applied, checkboxes
 * as checkboxes, the owner's frozen header kept, empty/hidden sheets left out, hidden columns never
 * reach a reader (a linked table's Record ID column).
 */
import { snapshotToGridSheets } from "../snapshot-grid";

const snapshot = {
  sheetOrder: ["s1", "empty", "hidden"],
  styles: {
    money: { n: { pattern: "$#,##0.00" } },
    day: { n: { pattern: "mmm d, yyyy" } },
    head: { bl: 1, bg: { rgb: "#1a73e8" }, cl: { rgb: "#ffffff" } },
  },
  sheets: {
    s1: {
      id: "s1",
      name: "To-do",
      freeze: { xSplit: 0, ySplit: 1 },
      columnData: { 3: { hd: 1 } },
      cellData: {
        0: { 0: { v: "Task", s: "head" }, 1: { v: "Done", s: "head" }, 2: { v: "Cost", s: "head" }, 3: { v: "Record ID" } },
        1: { 0: { v: "Write" }, 1: { v: 1 }, 2: { v: 1234.5, s: "money" }, 3: { v: "6f1c2a9e" } },
        2: { 0: { v: "Ship" }, 1: { v: 0 }, 2: { v: 46309, s: "day" } },
      },
    },
    empty: { id: "empty", name: "Sheet1", cellData: {} },
    hidden: { id: "hidden", name: "Scratch", hidden: 1, cellData: { 0: { 0: { v: "x" } } } },
  },
  resources: [
    { name: "SHEET_DATA_VALIDATION_PLUGIN", data: JSON.stringify({ s1: [{ type: "checkbox", ranges: [{ startRow: 1, endRow: 5, startColumn: 1, endColumn: 1 }] }] }) },
  ],
};

describe("a shared workbook as a sheet", () => {
  const sheets = snapshotToGridSheets(snapshot);
  it("leaves out empty and hidden sheets", () => {
    expect(sheets.map((s) => s.name)).toEqual(["To-do"]);
  });
  it("keeps the frozen header and drops hidden columns", () => {
    expect(sheets[0].frozenRows).toBe(1);
    expect(sheets[0].columns.map((c) => c.index)).toEqual([0, 1, 2]);
    expect(JSON.stringify(sheets[0].rows)).not.toContain("6f1c2a9e");
  });
  it("draws checkbox cells as checkboxes, not 1 and 0", () => {
    const [, done, ship] = [sheets[0].rows[0], sheets[0].rows[1], sheets[0].rows[2]];
    expect(done.cells[1].checkbox).toEqual({ checked: true });
    expect(ship.cells[1].checkbox).toEqual({ checked: false });
    expect(done.cells[1].text).toBe("");
  });
  it("applies currency and date formats and right-aligns numbers", () => {
    expect(sheets[0].rows[1].cells[2].text).toBe("$1,234.50");
    expect(sheets[0].rows[1].cells[2].align).toBe("right");
    expect(sheets[0].rows[2].cells[2].text).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
  });
  it("carries the header's bold and fill", () => {
    expect(sheets[0].rows[0].cells[0]).toMatchObject({ bold: true, bg: "#1a73e8", color: "#ffffff" });
  });
});
