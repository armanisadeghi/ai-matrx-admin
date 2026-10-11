/**
 * xlsxToUniverWorkbook — parse a spreadsheet file into a Univer IWorkbookData
 * suitable for `apiRef.createWorkbook(...)` and for persistence as the initial
 * snapshot of a new workbook.
 *
 * ONE reader: ExcelJS (`xlsx-to-univer-excel`) holds styles, number formats,
 * widths, heights, frozen panes, merges, validation, conditional formatting,
 * filter range, notes, links and pictures. A file that is not already an
 * .xlsx (.xls, .ods, .csv, .tsv) is first re-written as an .xlsx by the
 * Alchemy workbook door — values, formulas and merges — and read by that same
 * reader, so there is no second import path to drift.
 */

import { readWorkbook } from "@ai-matrx/alchemy/operate/read";
import { writeWorkbookBytes } from "@ai-matrx/alchemy/operate/formats/xlsx";
import type { WorkbookJson } from "@ai-matrx/alchemy/operate/read";
import type { IWorkbookData } from "@univerjs/core";
import { importXlsxWithExcelJs, type XlsxImportOptions } from "@/features/workbooks/xlsx-to-univer-excel";

/** A legacy or text spreadsheet as .xlsx bytes (values, formulas, merges). */
async function legacyToXlsxBytes(file: File): Promise<ArrayBuffer> {
  const wb = await readWorkbook(file, { dates: true, formulas: true });
  const json: WorkbookJson = {
    sheets: wb.sheets.map((ws) => {
      const range = ws.range ?? { s: { r: 0, c: 0 }, e: { r: -1, c: -1 } };
      const rows: WorkbookJson["sheets"][number]["rows"] = [];
      for (let r = 0; r <= range.e.r; r++) {
        const row: WorkbookJson["sheets"][number]["rows"][number] = [];
        for (let c = 0; c <= range.e.c; c++) {
          const cell = ws.cell(r, c);
          if (!cell || cell.v === undefined || cell.v === null) {
            row.push(null);
            continue;
          }
          const v = cell.v instanceof Date ? cell.v.toISOString().slice(0, 10) : cell.v;
          if (cell.f) row.push({ v: typeof v === "boolean" || typeof v === "number" ? v : String(v), f: cell.f.replace(/^=/, "") });
          else row.push(v);
        }
        rows.push(row);
      }
      return { name: ws.name.slice(0, 31) || "Sheet1", rows, merges: ws.merges };
    }),
  };
  const bytes = await writeWorkbookBytes(json);
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

/**
 * Parse a spreadsheet file into a Univer workbook. Whatever could not be
 * carried is reported through `options.onDropped` (the caller tells the person).
 */
export async function xlsxToUniverWorkbook(
  file: File,
  options: XlsxImportOptions = {},
): Promise<Partial<IWorkbookData>> {
  if (/\.xlsx$/i.test(file.name)) return importXlsxWithExcelJs(file, options);
  const data = await legacyToXlsxBytes(file);
  return importXlsxWithExcelJs({ name: file.name, arrayBuffer: async () => data }, options);
}
