/**
 * The table ⇄ workbook link's match and diff logic, driven through the real builders: a table is
 * laid out as a sheet exactly as "Open as workbook" writes it, the sheet is edited the way a person
 * edits it, and the plan must name exactly what an update would do. Each case fails if the
 * matching (by hidden record id, by header), the three-way baseline, or the rules check breaks.
 */
import {
  RECORD_ID_HEADER,
  buildLinkedWorkbook,
  linkedFieldFor,
  parseSheet,
  type LinkedField,
  type SheetCell,
  type WorkbookLike,
} from "../link-model";
import { describeIssue, matchRowsToRecords, planToSheet, planToTable } from "../sync-plan";

const field = (field_name: string, display_name: string, data_type: string, format?: unknown) =>
  ({ field_name, display_name, data_type, metadata: format ? { format } : {} }) as Parameters<typeof linkedFieldFor>[0];

const FIELDS: LinkedField[] = [
  linkedFieldFor(field("company", "Company", "string")),
  linkedFieldFor(field("stage", "Stage", "string", { id: "choice", options: { choices: [{ value: "Lead" }, { value: "Proposal" }, { value: "Won" }] } })),
  linkedFieldFor(field("deal_value", "Deal value", "number", { id: "currency", options: { currency: "USD" } })),
  linkedFieldFor(field("signed", "Signed", "boolean")),
  linkedFieldFor(field("close_date", "Close date", "date")),
  linkedFieldFor(field("owner", "Owner", "string", { id: "relation", options: {} })),
];

const ROWS = [
  { id: "rec-1", data: { company: "Harbor Dental Group", stage: "Lead", deal_value: 18500, signed: false, close_date: "2026-11-14", owner: "u-1" } },
  { id: "rec-2", data: { company: "Northwind Logistics", stage: "Proposal", deal_value: 42000, signed: false, close_date: "2026-12-01", owner: "u-2" } },
  { id: "rec-3", data: { company: "Blue Mesa Clinics", stage: "Won", deal_value: 9900, signed: true, close_date: "2026-10-02", owner: "u-1" } },
];
const DISPLAY = { owner: new Map([["rec-1", "Dana Ortiz"], ["rec-2", "Sam Lee"], ["rec-3", "Dana Ortiz"]]) };
const SHEET = "sheet-deals";

function exported(): WorkbookLike {
  return buildLinkedWorkbook({ name: "Pipeline", fields: FIELDS, rows: ROWS, display: DISPLAY }, { workbookId: "wb-1", sheetId: SHEET });
}

function clone(wb: WorkbookLike): WorkbookLike {
  return JSON.parse(JSON.stringify(wb)) as WorkbookLike;
}

function setCell(wb: WorkbookLike, row: number, col: number, cell: SheetCell | null) {
  const data = wb.sheets![SHEET].cellData!;
  data[row] = { ...(data[row] ?? {}) };
  if (cell) data[row]![col] = cell;
  else delete data[row]![col];
}

const col = (header: string) => FIELDS.findIndex((f) => f.header === header);
const ID_COL = FIELDS.length;
const link = { fields: FIELDS };

describe("table laid out as a sheet", () => {
  it("puts the header row first, the record id in a hidden last column, dropdowns on choice columns", () => {
    const wb = exported();
    const sheet = wb.sheets![SHEET];
    expect(sheet.cellData![0]![ID_COL]!.v).toBe(RECORD_ID_HEADER);
    expect(sheet.columnData![ID_COL]!.hd).toBe(1);
    expect(sheet.cellData![1]![ID_COL]!.v).toBe("rec-1");
    expect(sheet.freeze?.ySplit).toBe(1);
    const rules = JSON.parse(wb.resources![0].data)[SHEET] as Array<{ type: string; formula1?: string; ranges: Array<{ startColumn: number }> }>;
    const stage = rules.find((r) => r.ranges[0].startColumn === col("Stage"));
    expect(stage).toMatchObject({ type: "list", formula1: "Lead,Proposal,Won" });
    expect(rules.find((r) => r.ranges[0].startColumn === col("Signed"))?.type).toBe("checkbox");
    // Read-only columns show their words, never the stored id.
    expect(sheet.cellData![1]![col("Owner")]!.v).toBe("Dana Ortiz");
  });

  it("round-trips: an untouched export plans no change in either direction", () => {
    const wb = exported();
    const parsed = parseSheet(wb, SHEET)!;
    const toTable = planToTable({ sheet: parsed, baseline: parsed, link, tableRows: ROWS });
    expect(toTable.issues).toEqual([]);
    expect([toTable.added, toTable.changed, toTable.removed].map((l) => l.length)).toEqual([0, 0, 0]);
    const toSheet = planToSheet({ sheet: parsed, baseline: parsed, link, tableRows: ROWS, display: DISPLAY });
    expect(toSheet.writes).toEqual([]);
  });
});

describe("update table from sheet", () => {
  it("finds an edited dropdown cell, an added row, a removed row, and leaves table-side edits alone", () => {
    const base = exported();
    const edited = clone(base);
    setCell(edited, 2, col("Stage"), { v: "Won", t: 1 }); // Northwind: Proposal → Won
    setCell(edited, 2, col("Signed"), { v: 1, t: 2 });
    setCell(edited, 4, col("Company"), { v: "Cedar Ridge Vet", t: 1 }); // new row, no id
    setCell(edited, 4, col("Stage"), { v: "Lead", t: 1 });
    setCell(edited, 4, col("Deal value"), { v: "$7,250", t: 1 });
    edited.sheets![SHEET].cellData![3] = {}; // Blue Mesa row deleted in the sheet
    // Meanwhile someone edited Harbor's deal value in the table.
    const table = ROWS.map((r) => (r.id === "rec-1" ? { ...r, data: { ...r.data, deal_value: 21000 } } : r));

    const plan = planToTable({ sheet: parseSheet(edited, SHEET)!, baseline: parseSheet(base, SHEET)!, link, tableRows: table });
    expect(plan.blocking).toBe(false);
    expect(plan.changed).toHaveLength(1);
    expect(plan.changed[0].id).toBe("rec-2");
    expect(plan.changed[0].changes.map((c) => [c.header, c.from, c.to])).toEqual([
      ["Stage", "Proposal", "Won"],
      ["Signed", false, true],
    ]);
    expect(plan.added).toHaveLength(1);
    expect(plan.added[0].values).toMatchObject({ company: "Cedar Ridge Vet", stage: "Lead", deal_value: 7250 });
    expect(plan.removed.map((r) => r.id)).toEqual(["rec-3"]);
    expect(plan.tableNewer).toBe(1); // Harbor's 21000 is kept, not reverted to 18500
  });

  it("marks a conflict when both sides changed the same field", () => {
    const base = exported();
    const edited = clone(base);
    setCell(edited, 1, col("Deal value"), { v: 19000, t: 2 });
    const table = ROWS.map((r) => (r.id === "rec-1" ? { ...r, data: { ...r.data, deal_value: 21000 } } : r));
    const plan = planToTable({ sheet: parseSheet(edited, SHEET)!, baseline: parseSheet(base, SHEET)!, link, tableRows: table });
    expect(plan.changed[0].changes[0]).toMatchObject({ header: "Deal value", from: 21000, to: 19000, conflict: true });
  });

  it("names a renamed header by column and keeps going with the other fields", () => {
    const base = exported();
    const edited = clone(base);
    setCell(edited, 0, col("Stage"), { v: "Pipeline stage", t: 1 });
    setCell(edited, 1, col("Company"), { v: "Harbor Dental", t: 1 });
    const plan = planToTable({ sheet: parseSheet(edited, SHEET)!, baseline: parseSheet(base, SHEET)!, link, tableRows: ROWS });
    expect(plan.issues).toContainEqual(expect.objectContaining({ kind: "missing_header", header: "Stage", column: "B", found: "Pipeline stage" }));
    expect(describeIssue(plan.issues[0])).toBe('Column B was "Stage", now "Pipeline stage"');
    expect(plan.changed.map((c) => c.changes.map((x) => x.header))).toEqual([["Company"]]);
    expect(plan.located.extraColumns.map((c) => c.header)).toEqual(["Pipeline stage"]);
  });

  it("refuses to match anything when the id column is gone", () => {
    const edited = exported();
    setCell(edited, 0, ID_COL, null);
    const plan = planToTable({ sheet: parseSheet(edited, SHEET)!, baseline: null, link, tableRows: ROWS });
    expect(plan.blocking).toBe(true);
    expect(plan.issues[0].kind).toBe("missing_id_column");
    expect(plan.added).toEqual([]);
  });

  it("turns a copied row (same id twice) into a new record and says so", () => {
    const edited = exported();
    edited.sheets![SHEET].cellData![4] = { ...edited.sheets![SHEET].cellData![1] };
    const plan = planToTable({ sheet: parseSheet(edited, SHEET)!, baseline: null, link, tableRows: ROWS });
    expect(plan.added).toHaveLength(1);
    expect(plan.issues).toContainEqual({ kind: "duplicate_id", id: "rec-1", rows: [2, 5] });
  });

  it("lists columns the person added and ignores them", () => {
    const edited = exported();
    setCell(edited, 0, ID_COL + 1, { v: "Notes", t: 1 });
    setCell(edited, 1, ID_COL + 1, { v: "call back Tuesday", t: 1 });
    const plan = planToTable({ sheet: parseSheet(edited, SHEET)!, baseline: null, link, tableRows: ROWS });
    expect(plan.located.extraColumns.map((c) => `${c.letter}:${c.header}`)).toEqual(["H:Notes"]);
    expect(plan.changed).toEqual([]);
  });
});

describe("choices the store keeps as lowercase keys", () => {
  it("shows the list's word, and a key that matches the word is not a change", () => {
    const stored = ROWS.map((r) => ({ ...r, data: { ...r.data, stage: String(r.data.stage).toLowerCase() } }));
    const wb = buildLinkedWorkbook({ name: "Pipeline", fields: FIELDS, rows: stored, display: DISPLAY }, { workbookId: "wb-1", sheetId: SHEET });
    expect(wb.sheets![SHEET].cellData![2]![col("Stage")]!.v).toBe("Proposal");
    const parsed = parseSheet(wb, SHEET)!;
    const plan = planToTable({ sheet: parsed, baseline: null, link, tableRows: stored });
    expect(plan.changed).toEqual([]);
    expect(planToSheet({ sheet: parsed, baseline: null, link, tableRows: stored, display: DISPLAY }).writes).toEqual([]);
  });
});

describe("refresh sheet from table", () => {
  it("writes table edits in place, keeps sheet-only edits, appends new records, clears gone ones", () => {
    const base = exported();
    const edited = clone(base);
    setCell(edited, 1, col("Company"), { v: "Harbor Dental (HQ)", t: 1 }); // sheet-only edit
    const table = [
      { ...ROWS[0] },
      { ...ROWS[1], data: { ...ROWS[1].data, stage: "Won" } }, // table edit
      { id: "rec-4", data: { company: "Pinecrest Pediatrics", stage: "Lead", deal_value: 12000, signed: false, close_date: "2027-01-15", owner: "u-2" } },
    ]; // rec-3 archived
    const display = { owner: new Map([...DISPLAY.owner, ["rec-4", "Sam Lee"]]) };
    const plan = planToSheet({ sheet: parseSheet(edited, SHEET)!, baseline: parseSheet(base, SHEET)!, link, tableRows: table, display });
    expect(plan.updated.map((u) => [u.id, u.changes.map((c) => c.header)])).toEqual([["rec-2", ["Stage"]]]);
    expect(plan.writes).toContainEqual({ row: 2, col: col("Stage"), cell: { v: "Won", t: 1 } });
    expect(plan.sheetEditsKept).toBe(1);
    expect(plan.cleared.map((c) => c.id)).toEqual(["rec-3"]);
    expect(plan.appended).toEqual([{ id: "rec-4", row: 5, label: "Pinecrest Pediatrics" }]);
    expect(plan.writes).toContainEqual({ row: 4, col: ID_COL, cell: { v: "rec-4", t: 1 } });
    expect(plan.writes).toContainEqual({ row: 4, col: col("Owner"), cell: { v: "Sam Lee", t: 1, s: "tl-ro" } });
  });
});

describe("Make table: pairing sheet rows with the records the import made", () => {
  it("matches by typed values (date serials, choice keys), never by position", () => {
    // A sheet a person typed: dates are day serials, no id column yet.
    const typed = exported();
    for (const row of [1, 2, 3]) delete typed.sheets![SHEET].cellData![row]![ID_COL];
    // The store hands records back in another order, with lowercase choice keys.
    const records = [ROWS[2], ROWS[0], ROWS[1]].map((r) => ({ ...r, data: { ...r.data, stage: String(r.data.stage).toLowerCase() } }));
    const { matched, unmatched } = matchRowsToRecords(parseSheet(typed, SHEET)!, FIELDS, records);
    expect([...matched.entries()]).toEqual([[1, "rec-1"], [2, "rec-2"], [3, "rec-3"]]);
    expect(unmatched).toEqual([]);
  });

  it("leaves a row that matches nothing unmatched instead of guessing", () => {
    const typed = exported();
    const { matched, unmatched } = matchRowsToRecords(parseSheet(typed, SHEET)!, FIELDS, [ROWS[0]]);
    expect([...matched.values()]).toEqual(["rec-1"]);
    expect(unmatched).toEqual([3, 4]);
  });
});
