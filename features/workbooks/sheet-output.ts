/**
 * Current-sheet outputs of a workbook: CSV download and Print / Save as PDF.
 * Both read the same string grid the rest of the workbook code reads
 * (`univerSnapshotToRows`) — one source of what "the sheet" contains.
 */

import { downloadFile } from "@ai-matrx/kit/download";
import { toDelimitedText } from "@ai-matrx/alchemy/operate/read";
import { univerSnapshotToRows } from "@/features/workbooks/univer-snapshot-rows";

export function rowsToCsv(rows: readonly (readonly string[])[]): string {
  const [header, ...body] = rows;
  if (!header) return "";
  return toDelimitedText(header, body, { spreadsheetSafe: false });
}

export function downloadSheetAsCsv(
  snapshot: unknown,
  options: { sheetId?: string; filename: string },
): boolean {
  const grid = univerSnapshotToRows(snapshot, options.sheetId ? { sheetId: options.sheetId } : {});
  if (!grid || grid.rows.length === 0) return false;
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
  if (!grid || grid.rows.length === 0) return false;
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
 * Real PDF download of the current sheet (not the print sheet): the grid goes through the
 * platform's document exporter, which writes the file and says so. Returns false when empty.
 */
export async function downloadSheetAsPdf(
  snapshot: unknown,
  options: { sheetId?: string; title: string },
): Promise<boolean> {
  const grid = univerSnapshotToRows(snapshot, options.sheetId ? { sheetId: options.sheetId } : {});
  if (!grid || grid.rows.length === 0) return false;
  const { exportContent } = await import("@ai-matrx/rich-content/copy/content-export");
  await exportContent(
    `# ${options.title} — ${grid.sheetName}\n\n${rowsToMarkdownTable(grid.rows)}`,
    "pdf",
    options.title,
  );
  return true;
}
