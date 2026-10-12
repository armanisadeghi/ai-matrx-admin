/**
 * univerToXlsx — convert a Univer IWorkbookData snapshot to an .xlsx file.
 *
 * Symmetric counterpart to `xlsx-to-univer.ts`. Carries everything the xlsx
 * format can hold from what Univer holds: values, formulas, merged ranges,
 * cell styles and number formats, column widths, row heights, frozen panes,
 * data validation, conditional formatting, the header-row filter range,
 * notes, comment threads (as notes), cell links, and pictures.
 *
 * What it cannot carry is NAMED in the returned report and shown to the person
 * at export time — never dropped silently.
 *
 * Engine: ExcelJS (the xlsx reader/writer that holds styles, validation,
 * conditional formatting, notes, links and images; the registered
 * `xlsx-workbook` format writes values only). It is loaded on demand, so
 * the editor bundle does not pay for it until someone exports or imports.
 */

import { buildFile } from "@ai-matrx/alchemy/operate";
import type { WorkbookCellJson, WorkbookJson } from "@ai-matrx/alchemy/operate/read";
import type { ICellData, IWorkbookData, IWorksheetData } from "@univerjs/core";
import { downloadFile } from "@ai-matrx/kit/download";
import { loadExcelJs, type ExcelJSTypes } from "@ai-matrx/print/xlsx-styled";
import {
  H_ALIGN_OUT,
  RESOURCE,
  V_ALIGN_OUT,
  borderToExcel,
  colPxToChars,
  colorToArgb,
  readResource,
  rangeToA1,
  rowPxToPt,
  type RangeLike,
  type UniverResource,
} from "@/features/workbooks/xlsx-shared";

export type ExportXlsxOptions = {
  /** File name without extension. Defaults to "workbook". */
  filename?: string;
  /** Reads a picture's bytes (a `matrx-file:` reference or a URL). Pictures it cannot read are reported. */
  resolveImage?: ExportImagePort;
};

export type ExportImagePort = (
  source: string,
) => Promise<{ bytes: Uint8Array; extension: "png" | "jpeg" | "gif" } | null>;

/** What an export could not carry, in words for the person. Empty when nothing was lost. */
export type XlsxExportReport = { dropped: string[] };

type Snapshot = Partial<IWorkbookData>;
type Style = Record<string, unknown>;
type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any -- Univer resource payloads are untyped JSON

// ─── the thin WorkbookJson path (values + merges), kept for other callers ───

/** A Univer snapshot as the `xlsx-workbook` format's value (sheets of typed cells + merges). */
export function univerSnapshotToWorkbookJson(snapshot: Snapshot): WorkbookJson {
  const sheetOrder = snapshot.sheetOrder ?? Object.keys(snapshot.sheets ?? {});
  const sheets: WorkbookJson["sheets"] = [];
  for (const sheetId of sheetOrder) {
    const sheet = snapshot.sheets?.[sheetId];
    if (!sheet) continue;
    sheets.push(sheetToJson(sheet, (sheet.name ?? sheetId).slice(0, 31) || "Sheet1"));
  }
  return { sheets };
}

/** Full-fidelity bytes. Does NOT trigger a download. */
export async function univerSnapshotToXlsxBytes(
  snapshot: Snapshot,
  options: Pick<ExportXlsxOptions, "resolveImage"> = {},
): Promise<Uint8Array> {
  return (await buildXlsxFromUniver(snapshot, options)).bytes;
}

/** Convert + trigger a browser download; returns what could not be carried. */
export async function downloadUniverAsXlsx(
  snapshot: Snapshot,
  options: ExportXlsxOptions = {},
): Promise<XlsxExportReport> {
  if (typeof document === "undefined") return { dropped: [] };
  const filename = `${(options.filename ?? "workbook").replace(/\.xlsx$/i, "")}.xlsx`;
  const { bytes, report } = await buildXlsxFromUniver(snapshot, options);
  const blob = new Blob([bytes as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadFile(filename, blob, blob.type);
  return report;
}

// ─── the full-fidelity writer ──────────────────────────────────────────────

export async function buildXlsxFromUniver(
  snapshot: Snapshot,
  options: Pick<ExportXlsxOptions, "resolveImage"> = {},
): Promise<{ bytes: Uint8Array; report: XlsxExportReport }> {
  const ExcelJS = await loadExcelJs();
  const wb = new ExcelJS.Workbook();
  const dropped = new Set<string>();
  const resources = (snapshot.resources ?? []) as UniverResource[];
  const styles = (snapshot.styles ?? {}) as Record<string, Style>;

  const validation = readResource<Json>(resources, RESOURCE.validation) ?? {};
  const conditional = readResource<Json>(resources, RESOURCE.conditional) ?? {};
  const filters = readResource<Json>(resources, RESOURCE.filter) ?? {};
  const notes = readResource<Json>(resources, RESOURCE.note) ?? {};
  const comments = readResource<Json>(resources, RESOURCE.comments) ?? {};
  const drawings = readResource<Json>(resources, RESOURCE.drawing) ?? {};
  const tables = readResource<Json>(resources, RESOURCE.table) ?? {};

  const order = snapshot.sheetOrder ?? Object.keys(snapshot.sheets ?? {});
  for (const sheetId of order) {
    const sheet = snapshot.sheets?.[sheetId] as Partial<IWorksheetData> | undefined;
    if (!sheet) continue;
    const ws = wb.addWorksheet(uniqueName(wb, (sheet.name ?? sheetId).slice(0, 31) || "Sheet1"));
    writeCells(ws, sheet, styles);
    writeLayout(ws, sheet);
    const tab = colorToArgb(typeof sheet.tabColor === "string" ? sheet.tabColor : undefined);
    if (tab) ws.properties.tabColor = { argb: tab };
    writeValidation(ws, validation[sheetId], dropped);
    writeConditional(ws, conditional[sheetId], dropped);
    writeFilter(ws, filters[sheetId], dropped);
    writeNotes(ws, notes[sheetId], comments[sheetId], dropped);
    await writeImages(wb, ws, drawings[sheetId], options.resolveImage, dropped);
    if (tables[sheetId] && Object.keys(tables[sheetId]).length) {
      dropped.add("Tables are exported as plain ranges (their data and styling are kept)");
    }
  }

  const buffer = await wb.xlsx.writeBuffer();
  return { bytes: new Uint8Array(buffer as ArrayBuffer), report: { dropped: [...dropped] } };
}

function uniqueName(wb: ExcelJSTypes.Workbook, name: string): string {
  let candidate = name;
  let n = 2;
  while (wb.getWorksheet(candidate)) candidate = `${name.slice(0, 28)} ${n++}`;
  return candidate;
}

function styleOf(cell: ICellData, styles: Record<string, Style>): Style | undefined {
  const s = cell.s;
  if (!s) return undefined;
  return typeof s === "string" ? styles[s] : (s as Style);
}

function applyStyle(target: ExcelJSTypes.Cell, st: Style | undefined): void {
  if (!st) return;
  const font: Partial<ExcelJSTypes.Font> = {};
  if (st.ff) font.name = String(st.ff);
  if (typeof st.fs === "number") font.size = st.fs;
  if (st.bl === 1) font.bold = true;
  if (st.it === 1) font.italic = true;
  if ((st.ul as Json | undefined)?.s === 1) font.underline = true;
  if ((st.st as Json | undefined)?.s === 1) font.strike = true;
  const fg = colorToArgb((st.cl as Json | undefined)?.rgb);
  if (fg) font.color = { argb: fg };
  if (Object.keys(font).length) target.font = font;
  const bg = colorToArgb((st.bg as Json | undefined)?.rgb);
  if (bg) target.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
  const alignment: Partial<ExcelJSTypes.Alignment> = {};
  if (typeof st.ht === "number" && H_ALIGN_OUT[st.ht]) alignment.horizontal = H_ALIGN_OUT[st.ht] as ExcelJSTypes.Alignment["horizontal"];
  if (typeof st.vt === "number" && V_ALIGN_OUT[st.vt]) alignment.vertical = V_ALIGN_OUT[st.vt] as ExcelJSTypes.Alignment["vertical"];
  if (st.tb === 3) alignment.wrapText = true;
  if (Object.keys(alignment).length) target.alignment = alignment;
  const bd = st.bd as Json | undefined;
  if (bd) {
    const border: Partial<ExcelJSTypes.Borders> = {};
    for (const [key, side] of [["t", "top"], ["b", "bottom"], ["l", "left"], ["r", "right"]] as const) {
      const b = bd[key] as Json | undefined;
      const style = borderToExcel(b?.s);
      if (style) {
        (border as Json)[side] = { style, color: { argb: colorToArgb(b?.cl?.rgb) ?? "FF000000" } };
      }
    }
    if (Object.keys(border).length) target.border = border;
  }
  const pattern = (st.n as Json | undefined)?.pattern;
  if (typeof pattern === "string" && pattern && pattern !== "General") target.numFmt = pattern;
}

function plainText(p: Json | undefined): string {
  return String(p?.body?.dataStream ?? "").replace(/\r\n$/, "").replace(/\r\n/g, "\n");
}

function linkOf(p: Json | undefined): string | undefined {
  const ranges = p?.body?.customRanges as Json[] | undefined;
  return ranges?.find((r) => r.rangeType === 0 && r.properties?.url)?.properties?.url;
}

function writeCells(ws: ExcelJSTypes.Worksheet, sheet: Partial<IWorksheetData>, styles: Record<string, Style>): void {
  const cellData = sheet.cellData ?? {};
  for (const rKey of Object.keys(cellData)) {
    const r = Number(rKey);
    const row = cellData[r];
    if (!row || !Number.isFinite(r)) continue;
    for (const cKey of Object.keys(row)) {
      const c = Number(cKey);
      const cell = row[c] as ICellData | undefined;
      if (!cell || !Number.isFinite(c)) continue;
      const target = ws.getCell(r + 1, c + 1);
      const formula = typeof cell.f === "string" ? cell.f.replace(/^=/, "") : undefined;
      const rich = cell.p as Json | undefined;
      let value: ExcelJSTypes.CellValue = null;
      if (cell.v !== undefined && cell.v !== null && cell.v !== "") {
        if (cell.t === 3) value = Boolean(cell.v);
        else if (cell.t === 2 || typeof cell.v === "number") value = Number(cell.v);
        else value = String(cell.v);
      } else if (rich) {
        value = plainText(rich);
      }
      const url = linkOf(rich);
      if (url) value = { text: String(value ?? url), hyperlink: url };
      if (formula) value = { formula, result: (value as number | string | boolean | undefined) ?? undefined } as ExcelJSTypes.CellFormulaValue;
      if (value !== null && value !== "") target.value = value;
      applyStyle(target, styleOf(cell, styles));
    }
  }
}

function writeLayout(ws: ExcelJSTypes.Worksheet, sheet: Partial<IWorksheetData>): void {
  const defaultCol = sheet.defaultColumnWidth;
  const columns = sheet.columnData ?? {};
  for (const key of Object.keys(columns)) {
    const c = Number(key);
    const col = columns[c];
    if (!col) continue;
    const target = ws.getColumn(c + 1);
    if (typeof col.w === "number") target.width = colPxToChars(col.w);
    else if (defaultCol) target.width = colPxToChars(defaultCol);
    if (col.hd === 1) target.hidden = true;
  }
  const rows = sheet.rowData ?? {};
  for (const key of Object.keys(rows)) {
    const r = Number(key);
    const row = rows[r];
    if (!row) continue;
    const target = ws.getRow(r + 1);
    if (typeof row.h === "number") target.height = rowPxToPt(row.h);
    if (row.hd === 1) target.hidden = true;
  }
  for (const m of sheet.mergeData ?? []) {
    try {
      ws.mergeCells(m.startRow + 1, m.startColumn + 1, m.endRow + 1, m.endColumn + 1);
    } catch {
      /* an overlapping merge in a damaged snapshot: keep the first */
    }
  }
  const freeze = sheet.freeze;
  if (freeze && (freeze.xSplit > 0 || freeze.ySplit > 0)) {
    ws.views = [{ state: "frozen", xSplit: freeze.xSplit, ySplit: freeze.ySplit }];
  }
}

const eachCell = (ranges: RangeLike[], fn: (row: number, col: number) => void, cap = 100_000): boolean => {
  let n = 0;
  for (const r of ranges) {
    for (let row = r.startRow; row <= r.endRow; row++) {
      for (let col = r.startColumn; col <= r.endColumn; col++) {
        if (++n > cap) return false;
        fn(row, col);
      }
    }
  }
  return true;
};

function writeValidation(ws: ExcelJSTypes.Worksheet, rules: Json[] | undefined, dropped: Set<string>): void {
  for (const rule of rules ?? []) {
    const type = String(rule.type);
    const base: Json = {
      allowBlank: rule.allowBlank !== false,
      showErrorMessage: rule.showErrorMessage !== false,
      errorTitle: rule.errorTitle,
      error: rule.error,
      showInputMessage: Boolean(rule.showInputMessage),
      promptTitle: rule.promptTitle,
      prompt: rule.prompt,
    };
    let dv: Json | null = null;
    if (type === "list" || type === "listMultiple") {
      const f1 = String(rule.formula1 ?? "");
      const isRange = /^=?'?[^,"]*!?\$?[A-Z]+\$?\d+(:\$?[A-Z]+\$?\d+)?$/i.test(f1) && !f1.includes(",");
      dv = { ...base, type: "list", formulae: [isRange ? f1.replace(/^=/, "") : `"${f1.replace(/"/g, "")}"`] };
      if (type === "listMultiple") dropped.add("Multi-select dropdowns become single-select");
    } else if (type === "checkbox") {
      dv = { ...base, type: "list", formulae: ['"TRUE,FALSE"'] };
      dropped.add("Checkboxes become TRUE/FALSE dropdowns");
    } else if (["whole", "decimal", "date", "time", "textLength"].includes(type)) {
      dv = {
        ...base,
        type,
        operator: rule.operator ?? "between",
        formulae: [rule.formula1, rule.formula2].filter((f) => f !== undefined && f !== ""),
      };
    } else if (type === "custom") {
      dv = { ...base, type: "custom", formulae: [String(rule.formula1 ?? "").replace(/^=/, "")] };
    }
    if (!dv) continue;
    if (!dv.errorTitle) delete dv.errorTitle;
    const complete = eachCell((rule.ranges ?? []) as RangeLike[], (r, c) => {
      ws.getCell(r + 1, c + 1).dataValidation = dv as ExcelJSTypes.DataValidation;
    });
    if (!complete) dropped.add("Data validation on very large ranges was cut off");
  }
}

const NUMBER_OPS = new Set(["greaterThan", "greaterThanOrEqual", "lessThan", "lessThanOrEqual", "equal", "notEqual", "between", "notBetween"]);

function cfStyle(style: Json | undefined): Json {
  const out: Json = {};
  const font: Json = {};
  const fg = colorToArgb(style?.cl?.rgb);
  if (fg) font.color = { argb: fg };
  if (style?.bl === 1) font.bold = true;
  if (style?.it === 1) font.italic = true;
  if (Object.keys(font).length) out.font = font;
  const bg = colorToArgb(style?.bg?.rgb);
  if (bg) out.fill = { type: "pattern", pattern: "solid", bgColor: { argb: bg } };
  return out;
}

function writeConditional(ws: ExcelJSTypes.Worksheet, rules: Json[] | undefined, dropped: Set<string>): void {
  for (const entry of rules ?? []) {
    const ranges = (entry.ranges ?? []) as RangeLike[];
    if (!ranges.length) continue;
    const ref = ranges.map(rangeToA1).join(" ");
    const first = ranges[0]!;
    const topLeft = rangeToA1({ ...first, endRow: first.startRow, endColumn: first.startColumn });
    const rule = entry.rule as Json;
    let out: Json | null = null;
    if (rule?.type === "highlightCell") {
      const style = cfStyle(rule.style);
      switch (rule.subType) {
        case "number":
          if (NUMBER_OPS.has(rule.operator)) {
            out = { type: "cellIs", operator: rule.operator, formulae: Array.isArray(rule.value) ? rule.value : [rule.value], style };
          }
          break;
        case "text":
          if (rule.operator === "containsText") out = { type: "containsText", operator: "containsText", text: String(rule.value ?? ""), style };
          break;
        case "duplicateValues":
          out = { type: "expression", formulae: [`COUNTIF(${ref.split(" ")[0]},${topLeft})>1`], style };
          break;
        case "uniqueValues":
          out = { type: "expression", formulae: [`COUNTIF(${ref.split(" ")[0]},${topLeft})=1`], style };
          break;
        case "formula":
          out = { type: "expression", formulae: [String(rule.value ?? "").replace(/^=/, "")], style };
          break;
      }
    } else if (rule?.type === "colorScale" && Array.isArray(rule.config)) {
      const cfg = [...rule.config].sort((a: Json, b: Json) => a.index - b.index);
      out = {
        type: "colorScale",
        cfvo: cfg.map((c: Json) => ({ type: c.value?.type ?? "min", ...(c.value?.value !== undefined ? { value: c.value.value } : {}) })),
        color: cfg.map((c: Json) => ({ argb: colorToArgb(c.color) ?? "FFFFFFFF" })),
      };
    } else if (rule?.type === "dataBar") {
      out = {
        type: "dataBar",
        gradient: rule.config?.isGradient !== false,
        cfvo: [{ type: rule.config?.min?.type ?? "min" }, { type: rule.config?.max?.type ?? "max" }],
        color: { argb: colorToArgb(rule.config?.positiveColor) ?? "FF638EC6" },
      };
    }
    if (!out) {
      dropped.add("Some conditional formats (icon sets, top/bottom, average, date rules) are not written");
      continue;
    }
    ws.addConditionalFormatting({ ref, rules: [{ ...out, priority: 1 }] } as ExcelJSTypes.ConditionalFormattingOptions);
  }
}

function writeFilter(ws: ExcelJSTypes.Worksheet, filter: Json | undefined, dropped: Set<string>): void {
  const ref = filter?.ref as RangeLike | undefined;
  if (!ref) return;
  ws.autoFilter = {
    from: { row: ref.startRow + 1, column: ref.startColumn + 1 },
    to: { row: ref.endRow + 1, column: ref.endColumn + 1 },
  };
  if ((filter?.filterColumns as unknown[] | undefined)?.length) {
    dropped.add("Which filter choices were applied is not saved (the filter arrows are)");
  }
}

function threadText(c: Json): string {
  return String(c?.text?.dataStream ?? "").replace(/\r\n?$/, "").replace(/\r\n?/g, "\n");
}

function writeNotes(ws: ExcelJSTypes.Worksheet, sheetNotes: Json | undefined, sheetComments: Json | Json[] | undefined, dropped: Set<string>): void {
  for (const [row, cols] of Object.entries(sheetNotes ?? {})) {
    for (const [col, note] of Object.entries(cols as Json)) {
      const text = String((note as Json).note ?? "");
      if (text) ws.getCell(Number(row) + 1, Number(col) + 1).note = text;
    }
  }
  const list: Json[] = Array.isArray(sheetComments) ? sheetComments : sheetComments ? Object.values(sheetComments).flat() : [];
  const threads = new Map<string, string[]>();
  for (const c of list) {
    if (!c?.ref) continue;
    const lines = threads.get(c.ref) ?? [];
    const who = c.authorName ?? c.personId ?? "";
    lines.push(`${who ? who + ": " : ""}${threadText(c)}`);
    for (const child of (c.children ?? []) as Json[]) {
      lines.push(`${child.authorName ?? child.personId ?? ""}: ${threadText(child)}`);
    }
    threads.set(c.ref, lines);
  }
  for (const [ref, lines] of threads) {
    const cell = ws.getCell(ref);
    const existing = typeof cell.note === "string" ? cell.note : "";
    cell.note = [existing, ...lines].filter(Boolean).join("\n");
  }
  if (threads.size) dropped.add("Comment threads are written as cell notes (replies and resolved state are flattened)");
}

async function writeImages(
  wb: ExcelJSTypes.Workbook,
  ws: ExcelJSTypes.Worksheet,
  sheetDrawings: Json | undefined,
  resolve: ExportImagePort | undefined,
  dropped: Set<string>,
): Promise<void> {
  const data = (sheetDrawings?.data ?? {}) as Record<string, Json>;
  for (const d of Object.values(data)) {
    if (d.drawingType !== 0 || !d.source) continue;
    const from = d.sheetTransform?.from;
    if (!from) continue;
    let bytes: Uint8Array | null = null;
    let extension: "png" | "jpeg" | "gif" = "png";
    const dataUrl = /^data:image\/(png|jpeg|jpg|gif);base64,(.+)$/i.exec(String(d.source));
    if (dataUrl) {
      extension = dataUrl[1]!.toLowerCase() === "gif" ? "gif" : dataUrl[1]!.toLowerCase() === "png" ? "png" : "jpeg";
      bytes = Uint8Array.from(atob(dataUrl[2]!), (ch) => ch.charCodeAt(0));
    } else if (resolve) {
      try {
        const got = await resolve(String(d.source));
        if (got) ({ bytes, extension } = got);
      } catch {
        bytes = null;
      }
    }
    if (!bytes) {
      dropped.add("Some pictures could not be read and were left out");
      continue;
    }
    const id = wb.addImage({ buffer: bytes as unknown as ExcelJSTypes.Buffer, extension });
    ws.addImage(id, {
      tl: { col: from.column + (from.columnOffset ?? 0) / 64, row: from.row + (from.rowOffset ?? 0) / 20 },
      ext: { width: d.transform?.width ?? 200, height: d.transform?.height ?? 150 },
    });
  }
}

// ─── internals of the thin path ────────────────────────────────────────────

function sheetToJson(sheet: Partial<IWorksheetData>, name: string): WorkbookJson["sheets"][number] {
  const cellData = sheet.cellData ?? {};
  const rows: (WorkbookCellJson | null)[][] = [];
  for (const rKey of Object.keys(cellData)) {
    const r = Number(rKey);
    if (!Number.isFinite(r)) continue;
    const row = cellData[r];
    if (!row) continue;
    for (const cKey of Object.keys(row)) {
      const c = Number(cKey);
      if (!Number.isFinite(c)) continue;
      const cell = row[c];
      if (!cell) continue;
      const out = toWorkbookCell(cell);
      if (!out) continue;
      while (rows.length <= r) rows.push([]);
      const line = rows[r]!;
      while (line.length < c) line.push(null);
      line[c] = out;
    }
  }
  const merges = (sheet.mergeData ?? []).map((m) => ({
    s: { r: m.startRow, c: m.startColumn },
    e: { r: m.endRow, c: m.endColumn },
  }));
  return { name, rows, ...(merges.length ? { merges } : {}) };
}

function toWorkbookCell(cell: ICellData): WorkbookCellJson | null {
  const formula = typeof cell.f === "string" ? cell.f.replace(/^=/, "") : undefined;
  let out: WorkbookCellJson;
  switch (cell.t) {
    case 2:
      out = { t: "n", v: typeof cell.v === "number" ? cell.v : Number(cell.v ?? 0) };
      break;
    case 3:
      out = { t: "b", v: Boolean(cell.v) };
      break;
    default:
      out = {
        t: "s",
        v:
          cell.v === null || cell.v === undefined
            ? ""
            : typeof cell.v === "object"
              ? JSON.stringify(cell.v)
              : String(cell.v),
      };
  }
  if ((out.v === "" || out.v === null || out.v === undefined) && !formula) return null;
  return formula ? { ...out, f: formula } : out;
}

// Kept so existing callers of the registered-format path keep compiling.
export async function univerSnapshotToRegisteredXlsxBytes(snapshot: Snapshot): Promise<Uint8Array> {
  const built = await buildFile(
    { kind: "registered", format: "workbook", value: univerSnapshotToWorkbookJson(snapshot) },
    "xlsx-workbook",
  );
  return built.bytes;
}
