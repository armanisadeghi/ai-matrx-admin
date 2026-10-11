/**
 * The ONE door to ExcelJS — the only engine that holds styles, number formats,
 * validation, conditional formatting, notes, links and pictures in an .xlsx.
 * The Alchemy `xlsx` format (SheetJS community) writes and reads values only,
 * so the Univer workbook converters load ExcelJS here and nowhere else.
 * scripts/check-alchemy-doors.ts names this file as the single exemption;
 * it moves into @ai-matrx/print/xlsx when that package grows a styles engine.
 * Loaded on demand — nothing pays for it until a person imports or exports.
 */
import type ExcelJSModule from "exceljs";

export type * as ExcelJSTypes from "exceljs";

export async function loadExcelJs(): Promise<typeof ExcelJSModule> {
  return (await import("exceljs")).default;
}
