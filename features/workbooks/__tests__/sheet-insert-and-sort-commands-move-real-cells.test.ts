/**
 * Insert / Delete / Sort / Move rows of the workbook menus, run against a REAL Univer instance
 * (headless: core + sheets) with the sheet chrome's own command map. Found live 2026-10-14: Insert →
 * Insert 1 row above did nothing, because Univer's `insert-row-before` / `insert-col-before` read the
 * count from `params.value || 0` and the menu sent no params. A mocked executeCommand cannot see that —
 * this asks Univer and checks the cell MOVED.
 */
import {
  ICommandService,
  IUniverInstanceService,
  LocaleType,
  Univer,
  UniverInstanceType,
  type Workbook,
} from "@univerjs/core";
import {
  InsertColCommand,
  InsertColMutation,
  InsertRowCommand,
  InsertRowMutation,
  MoveColsCommand,
  MoveColsMutation,
  MoveRowsCommand,
  MoveRowsMutation,
  RemoveColCommand,
  RemoveColMutation,
  RemoveRowCommand,
  RemoveRowMutation,
  SetRangeValuesMutation,
  SetSelectionsOperation,
  UniverSheetsPlugin,
  InsertColBeforeCommand,
  InsertColAfterCommand,
  InsertRowBeforeCommand,
  InsertRowAfterCommand,
} from "@univerjs/preset-sheets-core";

import { buildSheetMenus, type SheetChromeHost } from "../chrome/sheet-commands";
import { flattenMenus } from "@/components/editor-chrome/editor-menu-model";

jest.mock("@/components/dialogs/value-prompts/valuePromptsOpener", () => ({ promptForValues: async () => null }));

function boot() {
  const univer = new Univer({ locale: LocaleType.EN_US, locales: {} });
  univer.registerPlugin(UniverSheetsPlugin);
  const wb = univer.createUnit<object, Workbook>(UniverInstanceType.UNIVER_SHEET, {
    id: "wb",
    sheetOrder: ["s1"],
    sheets: { s1: { id: "s1", name: "S", rowCount: 20, columnCount: 10, cellData: { 0: { 0: { v: "r0" }, 1: { v: "c1" } }, 1: { 0: { v: "r1" } }, 2: { 0: { v: "r2" } } } } },
  });
  const inj = univer.__getInjector();
  const cmd = inj.get(ICommandService);
  for (const c of [
    InsertRowBeforeCommand, InsertRowAfterCommand, InsertColBeforeCommand, InsertColAfterCommand, InsertRowCommand, InsertColCommand,
    InsertRowMutation, InsertColMutation, RemoveRowCommand, RemoveColCommand, RemoveRowMutation, RemoveColMutation,
    MoveRowsCommand, MoveColsCommand, MoveRowsMutation, MoveColsMutation, SetRangeValuesMutation, SetSelectionsOperation,
  ]) {
    try { cmd.registerCommand(c as never); } catch { /* already registered by the plugin */ }
  }
  const sheet = wb.getSheetBySheetId("s1")!;
  const select = (startRow: number, startColumn = 0, endRow = startRow, endColumn = startColumn) =>
    cmd.syncExecuteCommand(SetSelectionsOperation.id, {
      unitId: "wb",
      subUnitId: "s1",
      selections: [{ range: { startRow, endRow, startColumn, endColumn }, primary: { startRow, endRow: startRow, startColumn, endColumn: startColumn, actualRow: startRow, actualColumn: startColumn, isMerged: false, isMergedMainCell: false }, style: null }],
    });
  const host = {
    // The workbook chrome sends command ids through the facade; here the same ids go to Univer's command service.
    api: {
      executeCommand: (id: string, params?: object) => cmd.executeCommand(id, params),
      getActiveWorkbook: () => ({ getActiveSheet: () => null }),
      newDataValidation: () => ({}),
    },
    editable: true,
    print: () => undefined,
    formulaBarVisible: () => true,
    toggleFormulaBar: () => undefined,
    fullScreen: () => false,
    toggleFullScreen: () => undefined,
    notify: () => undefined,
  } as unknown as SheetChromeHost;
  const row = (r: number) => [0, 1].map((c) => sheet.getCellRaw(r, c)?.v ?? null);
  return { univer, host, select, sheet, row, run: (id: string) => flattenMenus(buildSheetMenus(host)).find((e) => e.id === id)!.run!() };
}

describe("Insert / Delete menu rows move real cells in a real Univer", () => {
  it("Insert 1 row above pushes the selected row down by one", async () => {
    const t = boot();
    t.select(1);
    expect(t.row(1)).toEqual(["r1", null]);
    await t.run("insert.rows.above");
    expect(t.row(1)).toEqual([null, null]);
    expect(t.row(2)).toEqual(["r1", null]);
    expect(t.row(3)).toEqual(["r2", null]);
    t.univer.dispose();
  });

  it("Insert 1 row below leaves the selected row and opens the next one", async () => {
    const t = boot();
    t.select(1);
    await t.run("insert.rows.below");
    expect(t.row(1)).toEqual(["r1", null]);
    expect(t.row(2)).toEqual([null, null]);
    expect(t.row(3)).toEqual(["r2", null]);
    t.univer.dispose();
  });

  it("Insert 1 column left pushes the selected column right by one", async () => {
    const t = boot();
    t.select(0, 1);
    await t.run("insert.columns.left");
    expect(t.sheet.getCellRaw(0, 1)?.v ?? null).toBeNull();
    expect(t.sheet.getCellRaw(0, 2)?.v).toBe("c1");
    t.univer.dispose();
  });

  it("Insert 1 column right keeps the selected column and opens the next one", async () => {
    const t = boot();
    t.select(0, 0);
    await t.run("insert.columns.right");
    expect(t.sheet.getCellRaw(0, 0)?.v).toBe("r0");
    expect(t.sheet.getCellRaw(0, 1)?.v ?? null).toBeNull();
    expect(t.sheet.getCellRaw(0, 2)?.v).toBe("c1");
    t.univer.dispose();
  });

  it("the guard fails when the menu sends no count (the 2026-10-14 defect)", async () => {
    const t = boot();
    t.select(1);
    // What the menu row did before the fix: the bare command id, no params.
    await Promise.resolve(t.host.api.executeCommand("sheet.command.insert-row-before")).catch(() => undefined);
    expect(t.row(1)).toEqual(["r1", null]); // nothing moved
    t.univer.dispose();
  });
});
