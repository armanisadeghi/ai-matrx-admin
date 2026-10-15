/**
 * Outputs of a workbook: CSV/TSV/HTML downloads of the current sheet, and Print / PDF of what its page setup asks for.
 * Both read the same string grid the rest of the workbook code reads
 * (`univerSnapshotToRows`) — one source of what "the sheet" contains.
 */

import { downloadFile } from "@ai-matrx/kit/download";
import { toDelimitedText } from "@ai-matrx/alchemy/operate/read";
import { PX_PER_INCH } from "@/features/documents/document-page-style";
import type { SheetPageSetup } from "@/features/workbooks/sheet-page-setup";
import { buildPrintDocument, collectPrintSheets, printDocumentHtml } from "@/features/workbooks/sheet-print-pages";
import { univerSnapshotToRows, type CellRange } from "@/features/workbooks/univer-snapshot-rows";

export function rowsToCsv(rows: readonly (readonly string[])[]): string {
  const [header, ...body] = rows;
  if (!header) return "";
  return toDelimitedText(header, body, { spreadsheetSafe: false });
}

export function downloadSheetAsCsv(
  snapshot: unknown,
  options: { sheetId?: string; filename: string },
): boolean {
  const grid = univerSnapshotToRows(snapshot, { skipHidden: true, ...(options.sheetId ? { sheetId: options.sheetId } : {}) });
  if (!grid || grid.rows.length === 0) return false;
  const name = `${options.filename.replace(/\.csv$/i, "")}.csv`;
  // BOM so Excel reads UTF-8.
  const blob = new Blob(["﻿", rowsToCsv(grid.rows)], { type: "text/csv;charset=utf-8" });
  downloadFile(name, blob, blob.type);
  return true;
}

/** Tab-separated values of the current sheet (Google's .tsv download). */
export function downloadSheetAsTsv(
  snapshot: unknown,
  options: { sheetId?: string; filename: string },
): boolean {
  const grid = univerSnapshotToRows(snapshot, { skipHidden: true, ...(options.sheetId ? { sheetId: options.sheetId } : {}) });
  if (!grid || grid.rows.length === 0) return false;
  const [header, ...body] = grid.rows;
  const text = toDelimitedText(header!, body, { format: "tsv", spreadsheetSafe: false });
  const blob = new Blob(["\uFEFF", text], { type: "text/tab-separated-values;charset=utf-8" });
  downloadFile(`${options.filename.replace(/\.tsv$/i, "")}.tsv`, blob, blob.type);
  return true;
}

/** The current sheet as a standalone web page (Google's .html download). */
export function downloadSheetAsHtml(
  snapshot: unknown,
  options: { sheetId?: string; filename: string },
): boolean {
  const grid = univerSnapshotToRows(snapshot, { skipHidden: true, ...(options.sheetId ? { sheetId: options.sheetId } : {}) });
  if (!grid || grid.rows.length === 0) return false;
  const body = grid.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("\n");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(options.filename)} — ${esc(grid.sheetName)}</title>
<style>body{font:13px system-ui,sans-serif;margin:16px}table{border-collapse:collapse}td{border:1px solid #c0c0c0;padding:2px 6px;vertical-align:top}</style></head>
<body><table>
${body}
</table></body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  downloadFile(`${options.filename.replace(/\.html?$/i, "")}.html`, blob, blob.type);
  return true;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** What a print or PDF needs besides the snapshot: the workbook's page setup and the live selection. */
export interface SheetPrintOptions {
  sheetId?: string;
  title: string;
  setup: SheetPageSetup;
  /** The cells selected right now (used when the setup prints "selected cells"). */
  selection?: CellRange | null;
}

function printDocumentFor(snapshot: unknown, options: SheetPrintOptions) {
  const sheets = collectPrintSheets(snapshot, options.setup, {
    ...(options.sheetId ? { sheetId: options.sheetId } : {}),
    selection: options.selection ?? null,
  });
  return buildPrintDocument(sheets, options.setup);
}

/** Opens the browser print sheet for what the workbook's page setup asks to print (choose "Save as PDF" there). */
export function printSheet(snapshot: unknown, options: SheetPrintOptions): boolean {
  const doc = printDocumentFor(snapshot, options);
  if (!doc) return false;
  const html = printDocumentHtml(doc, options.title);
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const fdoc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!fdoc || !win) {
    frame.remove();
    return false;
  }
  fdoc.open();
  fdoc.write(html);
  fdoc.close();
  win.addEventListener("afterprint", () => frame.remove());
  win.focus();
  win.print();
  return true;
}

/** The sheet's grid as a markdown table (first row is the header row). */
export function rowsToMarkdownTable(rows: readonly (readonly string[])[]): string {
  if (rows.length === 0) return "";
  const width = Math.max(...rows.map((r) => r.length));
  const cell = (v: string | undefined) => (v ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
  const line = (r: readonly string[]) =>
    `| ${Array.from({ length: width }, (_, i) => cell(r[i])).join(" | ")} |`;
  const [head, ...rest] = rows;
  return [line(head!), `| ${Array.from({ length: width }, () => "---").join(" | ")} |`, ...rest.map(line)].join("\n");
}

/**
 * Real PDF download of what the workbook's page setup prints: the same pages Print draws, each one
 * captured and laid on a PDF page of the chosen paper size and orientation. Returns false when empty.
 */
export async function downloadSheetAsPdf(snapshot: unknown, options: SheetPrintOptions): Promise<boolean> {
  const doc = printDocumentFor(snapshot, options);
  if (!doc) return false;
  const [{ renderElement, pagesToPdf }, { downloadFile: save }] = await Promise.all([
    import("@ai-matrx/alchemy/operate/capture"),
    import("@ai-matrx/kit/download"),
  ]);
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText = "position:fixed;left:-20000px;top:0";
  host.innerHTML = `<style>td{padding:0 6px;overflow:hidden;white-space:nowrap;vertical-align:middle}</style>${doc.pagesHtml.join("")}`;
  document.body.appendChild(host);
  try {
    const pages = [];
    for (const el of Array.from(host.querySelectorAll<HTMLElement>("[data-print-page]"))) {
      const image = await renderElement(el, { pixelRatio: 2, backgroundColor: "#ffffff", cacheBust: true });
      pages.push({ image, imageType: "JPEG" as const, quality: 0.92, placement: "fill" as const });
    }
    const mm = (px: number) => Math.round(((px / PX_PER_INCH) * 25.4) * 100) / 100;
    const pdf = await pagesToPdf(pages, {
      orientation: doc.pageWidth > doc.pageHeight ? "landscape" : "portrait",
      unit: "mm",
      format: [mm(Math.min(doc.pageWidth, doc.pageHeight)), mm(Math.max(doc.pageWidth, doc.pageHeight))],
    });
    save(`${options.title.replace(/[\\/:*?"<>|]+/g, " ").trim() || "workbook"}.pdf`, pdf, "application/pdf");
  } finally {
    host.remove();
  }
  return true;
}
