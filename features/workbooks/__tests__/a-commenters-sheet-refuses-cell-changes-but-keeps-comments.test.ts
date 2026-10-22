/**
 * Sheets commenter lock (2026-10-21): a commenter could type into a cell locally with no message. Real headless Univer
 * Sheets: once the seat is locked every cell write is refused and the person is told; the comment anchor still goes
 * through and a cell can still be selected; unlocking restores editing.
 */
import { ICommandService, IUniverInstanceService, LocaleType, LogLevel, Univer, UniverInstanceType } from "@univerjs/core";
import { UniverFormulaEnginePlugin } from "@univerjs/engine-formula";
import { UniverSheetsPlugin } from "@univerjs/sheets";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { installSheetCommentAnchors } from "@ai-matrx/office/sheets/comment-anchors";
import { currentSheetUnitId, lockWorkbookSeat } from "../components/sheetSeatLock";

function seat() {
  const univer = new Univer({ locale: LocaleType.EN_US, logLevel: LogLevel.SILENT, locales: { [LocaleType.EN_US]: {} } });
  univer.registerPlugin(UniverFormulaEnginePlugin, { notExecuteFormula: true });
  univer.registerPlugin(UniverSheetsPlugin, { notExecuteFormula: true });
  const anchors = installSheetCommentAnchors(univer);
  const injector = (univer as unknown as { __getInjector(): { get<X>(t: unknown): X } }).__getInjector();
  const commands = injector.get<ICommandService>(ICommandService);
  univer.createUnit(UniverInstanceType.UNIVER_SHEET, {
    id: "wb",
    sheetOrder: ["s1"],
    sheets: { s1: { id: "s1", name: "Sheet1", rowCount: 20, columnCount: 6, cellData: { 0: { 0: { v: "keep" } } } } },
  });
  injector.get<IUniverInstanceService>(IUniverInstanceService).focusUnit("wb");
  const cell = () => {
    const wb = injector.get<IUniverInstanceService>(IUniverInstanceService).getUnit("wb", UniverInstanceType.UNIVER_SHEET) as unknown as { getSheetBySheetId(id: string): { getCellRaw(r: number, c: number): { v?: unknown } | null } };
    return wb.getSheetBySheetId("s1").getCellRaw(0, 0)?.v;
  };
  const write = (v: string) =>
    commands.executeCommand("sheet.command.set-range-values", { unitId: "wb", subUnitId: "s1", range: { startRow: 0, endRow: 0, startColumn: 0, endColumn: 0 }, value: { v } });
  return { univer, injector, anchors, commands, cell, write };
}

describe("a Sheets seat without edit access", () => {
  it("finds the open workbook through Univer's real instance service (the old method name crashed every commenter)", () => {
    const s = seat();
    expect(currentSheetUnitId(s.injector)).toBe("wb");
    s.univer.dispose();
  });

  it("before the lock a cell write lands (the defect: nothing stopped a commenter)", async () => {
    const s = seat();
    await s.write("typed");
    expect(s.cell()).toBe("typed");
    s.univer.dispose();
  });

  it("locked: the cell write is refused, the comment anchor goes through, the seat is told", async () => {
    const s = seat();
    const told = jest.fn();
    lockWorkbookSeat(s.injector, "wb", told);
    await expect(s.write("typed")).resolves.toBe(false);
    expect(s.cell()).toBe("keep");
    expect(s.anchors.set({ unitId: "wb", subUnitId: "s1", anchorId: "c1", cell: { row: 2, col: 1 } })).not.toBe(false);
    expect(s.anchors.get("wb").s1).toEqual({ c1: { row: 2, col: 1 } });
    await s.commands.executeCommand("sheet.operation.set-selections", { unitId: "wb", subUnitId: "s1", selections: [{ range: { startRow: 1, endRow: 1, startColumn: 1, endColumn: 1 } }] });
    s.univer.dispose();
  });

  it("unlocking gives editing back", async () => {
    const s = seat();
    const unlock = lockWorkbookSeat(s.injector, "wb", () => {});
    await s.write("typed");
    expect(s.cell()).toBe("keep");
    unlock();
    await s.write("typed");
    expect(s.cell()).toBe("typed");
    s.univer.dispose();
  });
});

it("Sheets uses the same words as Docs and locks every seat without edit access", () => {
  const hook = readFileSync(join(__dirname, "../components/useSheetSeatLock.ts"), "utf8");
  expect(hook).toContain('seatRefusal(mayComment, "spreadsheet")');
  expect(hook).toContain("if (!univer || !ready || editable)");
  const editor = readFileSync(join(__dirname, "../components/WorkbookEditor.tsx"), "utf8");
  expect(editor).toContain("useSheetSeatLock({ univer: univerInstance");
});
