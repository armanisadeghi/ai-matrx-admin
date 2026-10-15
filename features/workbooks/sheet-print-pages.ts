/**
 * The pages a workbook prints on: the snapshot's cells → paper-sized HTML pages that follow the
 * workbook's print settings (`sheet-page-setup.ts`). Print and Download as PDF both draw these
 * same pages, so what the browser prints is what the PDF holds.
 */

import { PX_PER_INCH } from "@/features/documents/document-page-style";
import {
  PRINT_ROW_HEIGHT,
  planSheetPrint,
  type PrintGeometry,
  type SheetPageSetup,
} from "@/features/workbooks/sheet-page-setup";
import { univerSheetIds, univerSnapshotToRows, type CellRange } from "@/features/workbooks/univer-snapshot-rows";

export interface PrintSheet {
  name: string;
  rows: string[][];
  frozenRows: number;
  frozenCols: number;
}

/** The sheets the setup's "what to print" asks for (empty sheets left out). */
export function collectPrintSheets(
  snapshot: unknown,
  setup: SheetPageSetup,
  options: { sheetId?: string; selection?: CellRange | null },
): PrintSheet[] {
  const read = (sheetId: string | undefined, range?: CellRange): PrintSheet | null => {
    const grid = univerSnapshotToRows(snapshot, { skipHidden: true, ...(sheetId ? { sheetId } : {}), ...(range ? { range } : {}) });
    if (!grid || grid.rows.length === 0) return null;
    return { name: grid.sheetName, rows: grid.rows, frozenRows: grid.frozenRows, frozenCols: grid.frozenCols };
  };
  if (setup.scope === "workbook") {
    return univerSheetIds(snapshot)
      .map((id) => read(id))
      .filter((s): s is PrintSheet => s !== null);
  }
  if (setup.scope === "selection") {
    const sel = options.selection;
    if (!sel || (sel.startRow === sel.endRow && sel.startColumn === sel.endColumn)) return [];
    const one = read(options.sheetId, sel);
    return one ? [one] : [];
  }
  const one = read(options.sheetId);
  return one ? [one] : [];
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const JUSTIFY = { left: "flex-start", center: "center", right: "flex-end" } as const;
const ALIGN = { top: "flex-start", middle: "center", bottom: "flex-end" } as const;

function pageHtml(
  sheet: PrintSheet,
  page: { rows: number[]; cols: number[] },
  scale: number,
  colWidths: number[],
  g: PrintGeometry,
  setup: SheetPageSetup,
  numbering: { sheet: string; at: number; of: number },
): string {
  const widths = page.cols.map((c) => colWidths[c] ?? 0);
  const tableW = widths.reduce((a, b) => a + b, 0);
  const tableH = page.rows.length * PRINT_ROW_HEIGHT;
  const border = setup.gridlines ? "1px solid #b7b7b7" : "none";
  const body = page.rows
    .map(
      (r) =>
        `<tr style="height:${PRINT_ROW_HEIGHT}px">${page.cols
          .map((c) => `<td style="border:${border}">${esc(sheet.rows[r]?.[c] ?? "")}</td>`)
          .join("")}</tr>`,
    )
    .join("");
  const cols = widths.map((w) => `<col style="width:${w}px">`).join("");
  return `<section data-print-page data-sheet="${esc(numbering.sheet)}" data-page-number="${numbering.at}" data-page-count="${numbering.of}" data-page-rows="${page.rows.length}" data-page-cols="${page.cols.length}" style="width:${g.paperWidth}px;height:${g.paperHeight}px;box-sizing:border-box;padding:${g.marginTop}px ${g.marginRight}px ${g.marginBottom}px ${g.marginLeft}px;background:#fff;overflow:hidden;break-after:page;page-break-after:always">
<div style="width:${g.areaWidth}px;height:${g.areaHeight}px;display:flex;justify-content:${JUSTIFY[setup.alignH]};align-items:${ALIGN[setup.alignV]};overflow:hidden">
<div data-print-content style="width:${tableW * scale}px;height:${tableH * scale}px;flex:none;overflow:hidden">
<table style="width:${tableW}px;table-layout:fixed;border-collapse:collapse;transform:scale(${scale});transform-origin:0 0;font:12px/${PRINT_ROW_HEIGHT - 2}px system-ui,sans-serif;color:#111"><colgroup>${cols}</colgroup><tbody>${body}</tbody></table>
</div></div></section>`;
}

export interface PrintDocument {
  /** Every page, in print order. */
  pagesHtml: string[];
  pageWidth: number;
  pageHeight: number;
  /** `@page` size in inches, for the browser's print engine. */
  pageSizeInches: { width: number; height: number };
}

/** All the printed pages of the chosen sheets under the setup (empty when there is nothing to print). */
export function buildPrintDocument(sheets: readonly PrintSheet[], setup: SheetPageSetup): PrintDocument | null {
  const out: string[] = [];
  let geometry: PrintGeometry | null = null;
  for (const sheet of sheets) {
    const plan = planSheetPrint(sheet.rows, setup, { rows: sheet.frozenRows, cols: sheet.frozenCols });
    geometry = plan.geometry;
    plan.pages.forEach((page, i) => {
      out.push(pageHtml(sheet, page, plan.scale, plan.colWidths, plan.geometry, setup, { sheet: sheet.name, at: i + 1, of: plan.pages.length }));
    });
  }
  if (!geometry || out.length === 0) return null;
  return {
    pagesHtml: out,
    pageWidth: geometry.paperWidth,
    pageHeight: geometry.paperHeight,
    pageSizeInches: { width: geometry.paperWidth / PX_PER_INCH, height: geometry.paperHeight / PX_PER_INCH },
  };
}

/** The whole printable web page: `@page` set to the paper, one section per page. */
export function printDocumentHtml(doc: PrintDocument, title: string): string {
  const { width, height } = doc.pageSizeInches;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>@page{size:${width.toFixed(3)}in ${height.toFixed(3)}in;margin:0}html,body{margin:0;padding:0;background:#fff}td{padding:0 6px;overflow:hidden;white-space:nowrap;text-overflow:clip;vertical-align:middle}section:last-child{break-after:auto;page-break-after:auto}</style></head>
<body data-print-paper="${width.toFixed(3)}x${height.toFixed(3)}in">${doc.pagesHtml.join("\n")}</body></html>`;
}
