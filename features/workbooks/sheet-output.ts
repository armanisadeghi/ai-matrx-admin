/**
 * Current-sheet outputs of a workbook: CSV download and Print / Save as PDF.
 * Both read the same string grid the rest of the workbook code reads
 * (`univerSnapshotToRows`) — one source of what "the sheet" contains.
 */

import { downloadFile } from "@ai-matrx/kit/download";
import { univerSnapshotToRows } from "@/features/workbooks/univer-snapshot-rows";

function csvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function rowsToCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}

export function downloadSheetAsCsv(
  snapshot: unknown,
  options: { sheetId?: string; filename: string },
): boolean {
  const grid = univerSnapshotToRows(snapshot, options.sheetId ? { sheetId: options.sheetId } : {});
  if (!grid) return false;
  const name = `${options.filename.replace(/\.csv$/i, "")}.csv`;
  // BOM so Excel reads UTF-8.
  const blob = new Blob(["﻿", rowsToCsv(grid.rows)], { type: "text/csv;charset=utf-8" });
  downloadFile(name, blob, blob.type);
  return true;
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Opens the browser print sheet for the current sheet (choose "Save as PDF" there). */
export function printSheet(
  snapshot: unknown,
  options: { sheetId?: string; title: string },
): boolean {
  const grid = univerSnapshotToRows(snapshot, options.sheetId ? { sheetId: options.sheetId } : {});
  if (!grid) return false;
  const body = grid.rows
    .map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`)
    .join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(options.title)}</title>
<style>body{font:12px system-ui,sans-serif;margin:16px}h1{font-size:14px;margin:0 0 8px}
table{border-collapse:collapse;width:100%}td{border:1px solid #bbb;padding:3px 6px;vertical-align:top}</style></head>
<body><h1>${esc(options.title)} — ${esc(grid.sheetName)}</h1><table>${body}</table></body></html>`;
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();
  win.addEventListener("afterprint", () => frame.remove());
  win.focus();
  win.print();
  return true;
}
