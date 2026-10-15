/**
 * View → Rows / Columns → Hide / Unhide, View → Hidden sheets, Insert → Emoji, run against a REAL Univer.
 * Found by review 2026-10-15: "Hide selected rows" ran Univer's `hide-row-confirm`, which reads only
 * whole-row selections, so with one cell selected (Google hides that cell's row) it did nothing.
 * The assertions read Univer's own row/column hidden state, never a mock.
 */
import {
  ICommandService,
  LocaleType,
  Univer,
  UniverInstanceType,
  type Workbook,
} from "@univerjs/core";
import { SetSelectionsOperation, UniverSheetsPlugin } from "@univerjs/preset-sheets-core";

import { buildSheetMenus, type SheetChromeHost } from "../chrome/sheet-commands";
import { flattenMenus } from "@/components/editor-chrome/editor-menu-model";

let promptAnswer: Record<string, string> | null = null;
jest.mock("@/components/dialogs/value-prompts/valuePromptsOpener", () => ({
  promptForValues: async () => promptAnswer,
}));

function boot() {
  const univer = new Univer({ locale: LocaleType.EN_US, locales: {} });
  univer.registerPlugin(UniverSheetsPlugin);
  const wb = univer.createUnit<object, Workbook>(UniverInstanceType.UNIVER_SHEET, {
    id: "wb",
    sheetOrder: ["s1", "s2"],
    sheets: {
      s1: { id: "s1", name: "One", rowCount: 20, columnCount: 10, cellData: { 0: { 0: { v: "a" } } } },
      s2: { id: "s2", name: "Two", rowCount: 5, columnCount: 5 },
    },
  });
  const cmd = univer.__getInjector().get(ICommandService);
  const sheet = wb.getSheetBySheetId("s1")!;
  let sel = { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 };
  const select = (startRow: number, startColumn = 0, endRow = startRow, endColumn = startColumn) => {
    sel = { startRow, endRow, startColumn, endColumn };
    cmd.syncExecuteCommand(SetSelectionsOperation.id, {
      unitId: "wb",
      subUnitId: "s1",
      selections: [{ range: sel, primary: { ...sel, endRow: startRow, endColumn: startColumn, actualRow: startRow, actualColumn: startColumn, isMerged: false, isMergedMainCell: false }, style: null }],
    });
  };
  const sheetFacade = (id: string, name: string) => ({
    getSheetId: () => id,
    getSheetName: () => name,
    getMaxRows: () => wb.getSheetBySheetId(id)!.getMaxRows(),
    getMaxColumns: () => wb.getSheetBySheetId(id)!.getMaxColumns(),
    isSheetHidden: () => wb.getSheetBySheetId(id)!.isSheetHidden() === 1,
    hideSheet: () => cmd.syncExecuteCommand("sheet.command.set-worksheet-hidden", { unitId: "wb", subUnitId: id }),
    showSheet: () => cmd.syncExecuteCommand("sheet.command.set-worksheet-show", { unitId: "wb", subUnitId: id }),
    getSelection: () => ({
      getActiveRange: () => ({
        getRange: () => sel,
        getValues: () => [[sheet.getCellRaw(sel.startRow, sel.startColumn)?.v ?? null]],
        getFormulas: () => [[""]],
        setValues: (v: unknown[][]) => {
          sheet.getCellMatrix().setValue(sel.startRow, sel.startColumn, { v: v[0]![0] as string });
        },
      }),
    }),
  });
  const notices: string[] = [];
  const host = {
    api: {
      executeCommand: (id: string, params?: object) => cmd.executeCommand(id, params),
      getActiveWorkbook: () => ({
        getId: () => "wb",
        getActiveSheet: () => sheetFacade("s1", "One"),
        getSheets: () => [sheetFacade("s1", "One"), sheetFacade("s2", "Two")],
      }),
      newDataValidation: () => ({}),
    },
    editable: true,
    print: () => undefined,
    formulaBarVisible: () => true,
    toggleFormulaBar: () => undefined,
    fullScreen: () => false,
    toggleFullScreen: () => undefined,
    notify: (m: string) => notices.push(m),
  } as unknown as SheetChromeHost;
  return {
    univer, select, sheet, wb, notices, cmd,
    run: (id: string) => flattenMenus(buildSheetMenus(host)).find((e) => e.id === id)!.run!(),
  };
}

describe("hide / unhide with only a cell selected", () => {
  it("Hide selected rows hides the row the cell sits in", async () => {
    const t = boot();
    t.select(3, 2);
    expect(t.sheet.getRowVisible(3)).toBe(true);
    await t.run("view.rows.hide");
    expect(t.sheet.getRowVisible(3)).toBe(false);
    expect(t.sheet.getRowVisible(2)).toBe(true);
    t.univer.dispose();
  });

  it("Unhide selected rows brings back hidden rows inside the selection", async () => {
    const t = boot();
    t.select(3, 2, 5, 2);
    await t.run("view.rows.hide");
    expect([3, 4, 5].map((r) => t.sheet.getRowVisible(r))).toEqual([false, false, false]);
    t.select(2, 0, 6, 0);
    await t.run("view.rows.show");
    expect([3, 4, 5].map((r) => t.sheet.getRowVisible(r))).toEqual([true, true, true]);
    t.univer.dispose();
  });

  it("Hide selected columns hides the column of the cell, Unhide returns it", async () => {
    const t = boot();
    t.select(2, 4);
    await t.run("view.columns.hide");
    expect(t.sheet.getColVisible(4)).toBe(false);
    expect(t.sheet.getColVisible(3)).toBe(true);
    t.select(0, 3, 0, 5);
    await t.run("view.columns.show");
    expect(t.sheet.getColVisible(4)).toBe(true);
    t.univer.dispose();
  });

  it("refuses to hide every row, and says so", async () => {
    const t = boot();
    t.select(0, 0, 19, 0);
    await t.run("view.rows.hide");
    expect(t.sheet.getRowVisible(5)).toBe(true);
    expect(t.notices).toEqual(["Can't hide every row"]);
    t.univer.dispose();
  });
});

describe("Hidden sheets and Emoji", () => {
  it("hides the current sheet and shows it again", async () => {
    const t = boot();
    await t.run("view.hidden-sheets.hide");
    expect(t.wb.getSheetBySheetId("s1")!.isSheetHidden()).toBe(1);
    await t.run("view.hidden-sheets.show");
    expect(t.wb.getSheetBySheetId("s1")!.isSheetHidden()).toBe(0);
    t.univer.dispose();
  });

  it("Show hidden sheets with none hidden says so", async () => {
    const t = boot();
    await t.run("view.hidden-sheets.show");
    expect(t.notices).toEqual(["No hidden sheets"]);
    t.univer.dispose();
  });

  it("Emoji appends the typed character to the active cell", async () => {
    const t = boot();
    t.select(0, 0);
    promptAnswer = { emoji: "\u{1F600}" };
    await t.run("insert.emoji");
    expect(t.sheet.getCellRaw(0, 0)?.v).toBe("a\u{1F600}");
    promptAnswer = null;
    t.univer.dispose();
  });
});
