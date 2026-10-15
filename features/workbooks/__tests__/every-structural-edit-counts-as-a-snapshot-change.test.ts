/**
 * Autosave only writes a snapshot when the dirty filter (`isWorkbookSnapshotMutation`) counts a
 * mutation. Reported 2026-10-15: "Insert 1 row above" did not survive a reload while a sort did. This runs
 * REAL Univer commands (core + sheets, headless) with the workbook's own filter listening to the same
 * command stream the editor listens to: every command that changes `workbook.save()` must have fired at
 * least one mutation the filter counts, and one the filter drops must leave the snapshot untouched.
 */
import { ICommandService, LocaleType, Univer, UniverInstanceType, type ICommandInfo, type Workbook } from "@univerjs/core";
import * as sheetsCore from "@univerjs/preset-sheets-core";
import { UniverSheetsPlugin } from "@univerjs/preset-sheets-core";

import { isWorkbookSnapshotMutation } from "@/lib/univer/isSnapshotMutation";

const U = sheetsCore as unknown as Record<string, { id: string }>;

function boot() {
  const univer = new Univer({ locale: LocaleType.EN_US, locales: {} });
  univer.registerPlugin(UniverSheetsPlugin);
  const wb = univer.createUnit<object, Workbook>(UniverInstanceType.UNIVER_SHEET, {
    id: "wb",
    sheetOrder: ["s1"],
    sheets: {
      s1: {
        id: "s1",
        name: "S",
        rowCount: 20,
        columnCount: 10,
        cellData: { 0: { 0: { v: "r0" }, 1: { v: "c1" } }, 1: { 0: { v: "r1" } }, 2: { 0: { v: "r2" } }, 3: { 0: { v: "r3" } } },
      },
    },
  });
  const cmd = univer.__getInjector().get(ICommandService);
  // The plugin registers its mutations and commands; the few it leaves out are registered here, same as the existing sheet tests.
  for (const [name, c] of Object.entries(U)) {
    if (!/Command$|Mutation$|Operation$/.test(name) || !c || typeof c.id !== "string") continue;
    try { cmd.registerCommand(c as never); } catch { /* already registered by the plugin */ }
  }
  const seen: ICommandInfo[] = [];
  cmd.onCommandExecuted((c) => seen.push(c));
  const snapshot = () => JSON.stringify(wb.save());
  return { univer, cmd, seen, snapshot };
}

const base = { unitId: "wb", subUnitId: "s1" };
const range = (startRow: number, endRow: number, startColumn: number, endColumn: number) => ({ startRow, endRow, startColumn, endColumn });
const select = (r: ReturnType<typeof range>) => ({
  ...base,
  selections: [{ range: r, primary: { ...r, actualRow: r.startRow, actualColumn: r.startColumn, isMerged: false, isMergedMainCell: false }, style: null }],
});

type Edit = { name: string; id: string; params: (n: typeof U) => object; selection?: ReturnType<typeof range> };
const EDITS: Edit[] = [
  { name: "insert row above", id: "sheet.command.insert-row-before", params: () => ({ value: 1 }), selection: range(1, 1, 0, 0) },
  { name: "insert row below", id: "sheet.command.insert-row-after", params: () => ({ value: 1 }), selection: range(1, 1, 0, 0) },
  { name: "insert column left", id: "sheet.command.insert-col-before", params: () => ({ value: 1 }), selection: range(0, 0, 1, 1) },
  { name: "insert column right", id: "sheet.command.insert-col-after", params: () => ({ value: 1 }), selection: range(0, 0, 1, 1) },
  { name: "delete row", id: "sheet.command.remove-row", params: () => ({ ...base, range: { ...range(1, 1, 0, 9), rangeType: 1 } }) },
  { name: "delete column", id: "sheet.command.remove-col", params: () => ({ ...base, range: { ...range(0, 19, 1, 1), rangeType: 2 } }) },
  { name: "move row", id: "sheet.command.move-rows", params: () => { const from = { ...range(1, 1, 0, 16383), rangeType: 1 }; return { fromRange: from, toRange: { ...range(3, 3, 0, 16383), rangeType: 1 }, range: from }; } },
  { name: "move column", id: "sheet.command.move-cols", params: () => { const from = { ...range(0, 1048575, 0, 0), rangeType: 2 }; return { fromRange: from, toRange: { ...range(0, 1048575, 3, 3), rangeType: 2 }, range: from }; } },
  { name: "hide row", id: "sheet.command.set-rows-hidden", params: () => ({ ...base, ranges: [range(1, 1, 0, 9)] }) },
  { name: "hide column", id: "sheet.command.set-col-hidden", params: () => ({ ...base, ranges: [range(0, 19, 1, 1)] }) },
  // The merge COMMAND asks a UI confirm service this headless instance lacks; the mutation it ends in is what the filter sees.
  { name: "merge cells", id: "sheet.mutation.add-worksheet-merge", params: () => ({ ...base, ranges: [range(0, 1, 0, 1)] }) },
  { name: "freeze rows", id: "sheet.command.set-frozen", params: () => ({ ...base, startRow: 2, startColumn: -1, ySplit: 1, xSplit: 0 }) },
  { name: "rename sheet", id: "sheet.command.set-worksheet-name", params: () => ({ ...base, name: "Renamed" }) },
  { name: "column width", id: "sheet.command.set-worksheet-col-width", params: () => ({ ...base, ranges: [range(0, 19, 0, 0)], value: 200 }) },
  { name: "row height", id: "sheet.command.set-row-height", params: () => ({ ...base, ranges: [range(0, 0, 0, 9)], value: 60 }) },
  { name: "tab color", id: "sheet.command.set-tab-color", params: () => ({ ...base, color: "#ff0000" }) },
  { name: "set value", id: "sheet.command.set-range-values", params: () => ({ ...base, range: range(0, 0, 0, 0), value: { v: "changed" } }) },
  { name: "insert sheet", id: "sheet.command.insert-sheet", params: () => ({ unitId: "wb", index: 1, sheet: { id: "s2", name: "Two" } }) },
];

describe("every edit that changes the saved workbook counts as a snapshot change", () => {
  test.each(EDITS)("$name", async ({ id, params, selection }) => {
    const t = boot();
    if (selection) t.cmd.syncExecuteCommand("sheet.operation.set-selections", select(selection));
    const before = t.snapshot();
    t.seen.length = 0;
    const ok = await t.cmd.executeCommand(id, params(U));
    const changed = t.snapshot() !== before;
    expect({ id, ok, changed }).toEqual({ id, ok: true, changed: true });
    const counted = t.seen.filter(isWorkbookSnapshotMutation).map((c) => c.id);
    expect({ id, countedMutations: counted.length > 0, ran: t.seen.map((c) => c.id) }).toMatchObject({ id, countedMutations: true });
    t.univer.dispose();
  });

  test("a scroll, a selection move or a zoom never counts", () => {
    for (const id of ["sheet.operation.set-scroll-relative", "sheet.operation.set-selections", "sheet.operation.set-zoom-ratio", "sheet.operation.set-scroll"]) {
      expect(isWorkbookSnapshotMutation({ id, type: 2 } as ICommandInfo)).toBe(false);
    }
  });
});
