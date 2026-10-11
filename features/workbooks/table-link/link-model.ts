/**
 * features/workbooks/table-link/link-model.ts — a custom table laid out as a sheet, and a sheet
 * read back as table values. PURE: no Univer runtime, no database (the tests drive it directly).
 *
 * THE LINK (one home): `workbench.udt_workbooks.metadata.table_links[]` — system metadata on the
 * workbook (Doctrine §3.2: `metadata` is system-only). One entry per linked sheet:
 *   table_id · organization_id · sheet_id · fields[] (field_name ↔ header, kind) ·
 *   baseline_snapshot_id (the workbook snapshot both sides agreed at the last sync) · last_synced_at.
 * The table side finds its workbooks by asking for workbooks whose metadata names it; nothing is
 * written on the table, so there is never a second copy of the link to drift.
 *
 * THE SHEET'S RULES: row 1 is the header row (each linked field's header, plus the hidden
 * `RECORD_ID_HEADER` column holding the record id), one record per row below it. Columns are found
 * by their HEADER, never by position — moving a column is fine, renaming its header breaks it.
 */

import { readFieldFormatConfig, type FieldFormatConfig } from "@ai-matrx/design-system/field-formats";
import type { DatasetField } from "@/features/data-tables/types";

/** The hidden column that carries each row's record id. Found by this exact header. */
export const RECORD_ID_HEADER = "Record ID";

/** Univer `CellValueType` numbers (kept literal so this module never loads the Univer runtime). */
const CELL_STRING = 1;
const CELL_NUMBER = 2;

/** Univer's data-validation resource name (`@univerjs/sheets-data-validation`). */
export const DATA_VALIDATION_RESOURCE = "SHEET_DATA_VALIDATION_PLUGIN";

export type LinkedFieldKind =
  | "text"
  | "number"
  | "boolean"
  | "date"
  | "datetime"
  | "choice"
  | "multi_choice"
  | "list_text"
  /** Relations, lookups, formulas, rollups, stamps, autonumbers, JSON: shown, never written. */
  | "readonly";

export interface LinkedField {
  field_name: string;
  header: string;
  kind: LinkedFieldKind;
  /** choice / multi_choice: the words the dropdown offers. */
  choices?: string[];
  /** Univer number-format pattern for the cells, when the field has one. */
  pattern?: string | null;
}

export interface TableLink {
  table_id: string;
  organization_id: string;
  sheet_id: string;
  fields: LinkedField[];
  baseline_snapshot_id: string | null;
  linked_at: string;
  last_synced_at: string | null;
  last_sync_direction: "to_sheet" | "to_table" | null;
}

/** A plain cell as the sheet holds it (Univer `ICellData`, the parts we read and write). */
export interface SheetCell {
  v?: string | number | boolean | null;
  t?: number;
  s?: string | null;
  f?: string;
}

/** The parts of a Univer workbook snapshot this module reads and writes. */
export interface SheetLike {
  id?: string;
  name?: string;
  cellData?: Record<string, Record<string, SheetCell | null | undefined> | undefined>;
  rowCount?: number;
  columnCount?: number;
  columnData?: Record<string, { w?: number; hd?: number } | undefined>;
  freeze?: { xSplit: number; ySplit: number; startRow: number; startColumn: number };
}

export interface WorkbookLike {
  id?: string;
  name?: string;
  sheetOrder?: string[];
  sheets?: Record<string, SheetLike>;
  styles?: Record<string, unknown>;
  resources?: Array<{ name: string; data: string }>;
}

// ─── field kinds ──────────────────────────────────────────────────────────────

const READONLY_FORMATS = new Set([
  "relation",
  "person",
  "attachment",
  "formula",
  "autonumber",
  "created_time",
  "modified_time",
  "relative_time",
  "json",
]);

function choiceWords(format: FieldFormatConfig | null): string[] {
  const choices = format?.options?.choices;
  if (!Array.isArray(choices)) return [];
  return choices
    .map((c) => (c && typeof c === "object" && typeof c.value === "string" ? c.value : null))
    .filter((w): w is string => !!w && !w.includes(","));
}

function numberPattern(format: FieldFormatConfig | null, dataType: string): string | null {
  const id = format?.id;
  const precision = typeof format?.options?.precision === "number" ? format.options.precision : null;
  const decimals = (n: number) => (n > 0 ? `.${"0".repeat(n)}` : "");
  if (id === "currency") {
    const code = format?.options?.currency ?? "USD";
    const symbol = code === "USD" ? "$" : code === "EUR" ? "€" : code === "GBP" ? "£" : `${code} `;
    return `${symbol}#,##0${decimals(precision ?? 2)}`;
  }
  if (id === "percent") {
    return format?.options?.percentScale === "fraction"
      ? `0${decimals(precision ?? 0)}%`
      : `0${decimals(precision ?? 0)}"%"`;
  }
  if (id === "decimal") return `#,##0${decimals(precision ?? 2)}`;
  if (id === "integer" || dataType === "integer") return "#,##0";
  return null;
}

/**
 * How a table column sits in a sheet. `sample` is a few of the column's stored values: a column
 * whose values are objects (an entity reference the grid reads as words) is read-only whatever
 * its type says.
 */
export function linkedFieldFor(field: Pick<DatasetField, "field_name" | "display_name" | "data_type" | "metadata">, sample: readonly unknown[] = []): LinkedField {
  const format = readFieldFormatConfig(field.metadata);
  const header = (field.display_name || field.field_name).trim();
  const base = { field_name: field.field_name, header };
  const holdsObjects = sample.some((v) => v !== null && typeof v === "object" && !(Array.isArray(v) && v.every((x) => typeof x !== "object")));
  if (holdsObjects || (format && READONLY_FORMATS.has(format.id)) || field.data_type === "json") {
    return { ...base, kind: "readonly" };
  }
  if (format?.id === "choice") return { ...base, kind: "choice", choices: choiceWords(format) };
  if (format?.id === "multi_choice") return { ...base, kind: "multi_choice", choices: choiceWords(format) };
  switch (field.data_type) {
    case "boolean":
      return { ...base, kind: "boolean" };
    case "date":
      return { ...base, kind: "date", pattern: "yyyy-mm-dd" };
    case "datetime":
      return { ...base, kind: "datetime", pattern: "yyyy-mm-dd hh:mm" };
    case "number":
    case "integer":
      return { ...base, kind: "number", pattern: numberPattern(format, field.data_type) };
    case "array":
      return { ...base, kind: "list_text" };
    default:
      return { ...base, kind: "text" };
  }
}

// ─── values: store ⇄ cell ─────────────────────────────────────────────────────

const DAY_MS = 86_400_000;
/** Spreadsheet serial day 0 (1899-12-30), the Excel/Univer epoch. */
const SERIAL_EPOCH_MS = Date.UTC(1899, 11, 30);

function toSerial(ms: number): number {
  return (ms - SERIAL_EPOCH_MS) / DAY_MS;
}

function fromSerial(serial: number): Date {
  return new Date(Math.round(SERIAL_EPOCH_MS + serial * DAY_MS));
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isoMinute(d: Date): string {
  return `${d.toISOString().slice(0, 16)}:00.000Z`;
}

function parseDateish(raw: string): Date | null {
  const text = raw.trim();
  if (!text) return null;
  // A bare date is a calendar day, never shifted by the reader's time zone.
  const bare = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (bare) return new Date(Date.UTC(Number(bare[1]), Number(bare[2]) - 1, Number(bare[3])));
  const ms = Date.parse(text.includes("T") || /[zZ]|[+-]\d\d:?\d\d$/.test(text) ? text : `${text.replace(" ", "T")}Z`);
  return Number.isNaN(ms) ? null : new Date(ms);
}

function listWords(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((w) => w.trim()).filter(Boolean);
  if (value === null || value === undefined) return [];
  return [String(value)];
}

/** A stored value as the cell that shows it (without style; the caller adds the column's style). */
export function cellFromValue(field: LinkedField, value: unknown, display?: string | null): SheetCell | null {
  if (field.kind === "readonly") {
    const text = display ?? displayText(value);
    return text === "" ? null : { v: text, t: CELL_STRING };
  }
  if (value === null || value === undefined || value === "") return null;
  switch (field.kind) {
    case "boolean":
      return { v: value === true || value === "true" ? 1 : 0, t: CELL_NUMBER };
    case "number": {
      const n = typeof value === "number" ? value : Number(value);
      return Number.isFinite(n) ? { v: n, t: CELL_NUMBER } : { v: String(value), t: CELL_STRING };
    }
    case "date":
    case "datetime": {
      const d = typeof value === "string" ? parseDateish(value) : null;
      if (!d) return { v: String(value), t: CELL_STRING };
      return { v: toSerial(d.getTime()), t: CELL_NUMBER };
    }
    case "choice":
      return { v: choiceWord(field, String(value)), t: CELL_STRING };
    case "multi_choice":
      return { v: listWords(value).map((w) => choiceWord(field, w)).join(", "), t: CELL_STRING };
    case "list_text":
      return { v: listWords(value).join(", "), t: CELL_STRING };
    default:
      return { v: String(value), t: CELL_STRING };
  }
}

/**
 * The list's own word for a stored choice. The store keeps a select's value as a lowercase key
 * ("proposal") while the list reads "Proposal"; the sheet shows the list's word so the dropdown
 * recognises it.
 */
function choiceWord(field: LinkedField, value: string): string {
  const lower = value.trim().toLowerCase();
  return field.choices?.find((c) => c.toLowerCase() === lower) ?? value;
}

export function displayText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map((v) => displayText(v)).join(", ");
  if (typeof value === "object") {
    const label = (value as { label?: unknown }).label;
    return typeof label === "string" ? label : JSON.stringify(value);
  }
  return String(value);
}

export type ReadValue = { ok: true; value: unknown } | { ok: false; value: unknown; problem: string };

/** A cell's value as the store value it means for this field. Never throws; a misfit says why. */
export function valueFromCell(field: LinkedField, cell: SheetCell | null | undefined): ReadValue {
  const raw = cell?.v;
  const empty = raw === null || raw === undefined || (typeof raw === "string" && raw.trim() === "");
  if (field.kind === "readonly") return { ok: true, value: empty ? null : String(raw) };
  if (empty) return { ok: true, value: field.kind === "multi_choice" || field.kind === "list_text" ? [] : field.kind === "boolean" ? false : null };
  switch (field.kind) {
    case "boolean": {
      if (typeof raw === "boolean") return { ok: true, value: raw };
      if (typeof raw === "number") return { ok: true, value: raw !== 0 };
      const w = String(raw).trim().toLowerCase();
      if (["true", "yes", "y", "1", "x", "✓"].includes(w)) return { ok: true, value: true };
      if (["false", "no", "n", "0"].includes(w)) return { ok: true, value: false };
      return { ok: false, value: raw, problem: "Not yes/no" };
    }
    case "number": {
      if (typeof raw === "number") return { ok: true, value: raw };
      const cleaned = String(raw).replace(/[$€£,\s%]/g, "");
      const n = Number(cleaned);
      return cleaned !== "" && Number.isFinite(n) ? { ok: true, value: n } : { ok: false, value: raw, problem: "Not a number" };
    }
    case "date":
    case "datetime": {
      const d = typeof raw === "number" ? fromSerial(raw) : parseDateish(String(raw));
      if (!d) return { ok: false, value: raw, problem: "Not a date" };
      return { ok: true, value: field.kind === "date" ? isoDate(d) : isoMinute(d) };
    }
    case "multi_choice":
    case "list_text":
      return { ok: true, value: listWords(raw) };
    default:
      return { ok: true, value: typeof raw === "string" ? raw.trim() : String(raw) };
  }
}

/** Do two store values mean the same thing for this field? (The diff's one equality.) */
export function sameValue(field: LinkedField, a: unknown, b: unknown): boolean {
  const norm = (v: unknown): string => {
    if (v === null || v === undefined || v === "") return "";
    switch (field.kind) {
      case "boolean":
        return v === true || v === "true" || v === 1 ? "true" : "false";
      case "number": {
        const n = typeof v === "number" ? v : Number(v);
        return Number.isFinite(n) ? String(Math.round(n * 1e9) / 1e9) : String(v);
      }
      case "date": {
        const d = typeof v === "string" ? parseDateish(v) : null;
        return d ? isoDate(d) : String(v);
      }
      case "datetime": {
        const d = typeof v === "string" ? parseDateish(v) : null;
        return d ? isoMinute(d) : String(v);
      }
      case "choice":
        return String(v).trim().toLowerCase();
      case "multi_choice":
        return listWords(v).map((w) => w.toLowerCase()).join("\u0001");
      case "list_text":
        return listWords(v).join("\u0001");
      case "readonly":
        return displayText(v).trim();
      default:
        return String(v).trim();
    }
  };
  const left = norm(a);
  const right = norm(b);
  if (field.kind === "boolean") return (left || "false") === (right || "false");
  return left === right;
}

// ─── table → sheet ────────────────────────────────────────────────────────────

export interface TableForSheet {
  name: string;
  fields: LinkedField[];
  rows: Array<{ id: string; data: Record<string, unknown> }>;
  /** Display words for read-only cells (relations), by field then record id. */
  display?: Record<string, Map<string, string>>;
}

const HEADER_STYLE_ID = "tl-header";
const READONLY_HEADER_STYLE_ID = "tl-header-ro";
const READONLY_STYLE_ID = "tl-ro";

function patternStyleId(pattern: string): string {
  let h = 0;
  for (let i = 0; i < pattern.length; i += 1) h = (h * 31 + pattern.charCodeAt(i)) | 0;
  return `tl-n${(h >>> 0).toString(36)}`;
}

/** Styles the linked sheet uses: bold header, muted read-only columns, number formats. */
export function linkStyles(fields: readonly LinkedField[]): Record<string, unknown> {
  const styles: Record<string, unknown> = {
    [HEADER_STYLE_ID]: { bl: 1, bg: { rgb: "#EEF2F7" } },
    [READONLY_HEADER_STYLE_ID]: { bl: 1, bg: { rgb: "#F3F4F6" }, cl: { rgb: "#6B7280" } },
    [READONLY_STYLE_ID]: { cl: { rgb: "#6B7280" } },
  };
  for (const f of fields) if (f.pattern) styles[patternStyleId(f.pattern)] = { n: { pattern: f.pattern } };
  return styles;
}

/** The style a body cell of this field carries. */
export function bodyStyleFor(field: LinkedField): string | null {
  if (field.kind === "readonly") return READONLY_STYLE_ID;
  return field.pattern ? patternStyleId(field.pattern) : null;
}

export function headerCell(field: LinkedField | null): SheetCell {
  if (!field) return { v: RECORD_ID_HEADER, t: CELL_STRING, s: HEADER_STYLE_ID };
  return { v: field.header, t: CELL_STRING, s: field.kind === "readonly" ? READONLY_HEADER_STYLE_ID : HEADER_STYLE_ID };
}

export function bodyCell(field: LinkedField, value: unknown, display?: string | null): SheetCell | null {
  const cell = cellFromValue(field, value, display);
  const s = bodyStyleFor(field);
  if (!cell) return s ? { s } : null;
  return s ? { ...cell, s } : cell;
}

function columnWidth(field: LinkedField, rows: TableForSheet["rows"]): number {
  const longest = rows.slice(0, 200).reduce((m, r) => Math.max(m, displayText(r.data[field.field_name]).length), field.header.length);
  return Math.max(80, Math.min(320, 12 + longest * 7));
}

/** Univer data-validation rules for the linked columns (dropdowns, checkboxes, dates, numbers). */
export function validationRules(fields: readonly LinkedField[], rowCount: number, idPrefix = "tl"): Array<Record<string, unknown>> {
  const rules: Array<Record<string, unknown>> = [];
  fields.forEach((field, col) => {
    const range = { startRow: 1, endRow: Math.max(1, rowCount - 1), startColumn: col, endColumn: col };
    const uid = `${idPrefix}-${col}-${field.kind}`;
    const base = { uid, ranges: [range], allowBlank: true, errorStyle: 2, showErrorMessage: true };
    if ((field.kind === "choice" || field.kind === "multi_choice") && field.choices && field.choices.length > 0) {
      rules.push({ ...base, type: field.kind === "choice" ? "list" : "listMultiple", formula1: field.choices.join(","), showDropDown: true, renderMode: 1 });
    } else if (field.kind === "boolean") {
      rules.push({ ...base, type: "checkbox" });
    } else if (field.kind === "date" || field.kind === "datetime") {
      rules.push({ ...base, type: "date", operator: "greaterThan", formula1: "1900-01-01" });
    } else if (field.kind === "number") {
      rules.push({ ...base, type: "decimal", operator: "greaterThan", formula1: "-1e15" });
    }
  });
  return rules;
}

/** A fresh sheet holding the table: header row, one record per row, hidden id column at the end. */
export function buildLinkedSheet(table: TableForSheet, sheetId: string): SheetLike {
  const { fields, rows } = table;
  const idCol = fields.length;
  const cellData: NonNullable<SheetLike["cellData"]> = {};
  const header: Record<string, SheetCell> = {};
  fields.forEach((f, c) => (header[c] = headerCell(f)));
  header[idCol] = headerCell(null);
  cellData[0] = header;
  rows.forEach((row, r) => {
    const out: Record<string, SheetCell> = {};
    fields.forEach((f, c) => {
      const cell = bodyCell(f, row.data[f.field_name], table.display?.[f.field_name]?.get(row.id) ?? null);
      if (cell) out[c] = cell;
    });
    out[idCol] = { v: row.id, t: CELL_STRING };
    cellData[r + 1] = out;
  });
  const columnData: NonNullable<SheetLike["columnData"]> = {};
  fields.forEach((f, c) => (columnData[c] = { w: columnWidth(f, rows) }));
  columnData[idCol] = { w: 80, hd: 1 };
  return {
    id: sheetId,
    name: table.name.replace(/[:\\/?*[\]]/g, " ").slice(0, 31).trim() || "Sheet1",
    cellData,
    rowCount: Math.max(rows.length + 1 + 200, 1000),
    columnCount: Math.max(idCol + 1, 26),
    columnData,
    freeze: { xSplit: 0, ySplit: 1, startRow: 1, startColumn: 0 },
  };
}

/** A whole workbook snapshot for a table, with its dropdowns and formats. */
export function buildLinkedWorkbook(table: TableForSheet, ids: { workbookId: string; sheetId: string }): WorkbookLike {
  const sheet = buildLinkedSheet(table, ids.sheetId);
  return {
    id: ids.workbookId,
    name: table.name,
    sheetOrder: [ids.sheetId],
    sheets: { [ids.sheetId]: sheet },
    styles: linkStyles(table.fields),
    resources: [
      {
        name: DATA_VALIDATION_RESOURCE,
        data: JSON.stringify({ [ids.sheetId]: validationRules(table.fields, sheet.rowCount ?? 1000) }),
      },
    ],
  };
}

// ─── sheet → rows ─────────────────────────────────────────────────────────────

export interface ParsedRow {
  /** 0-based sheet row index. */
  row: number;
  id: string | null;
  cells: Record<number, SheetCell | null | undefined>;
}

export interface ParsedSheet {
  sheetId: string;
  sheetName: string;
  /** Trimmed header text by 0-based column. */
  headers: Map<number, string>;
  rows: ParsedRow[];
  /** Highest column holding anything (header or body). */
  maxCol: number;
}

function cellText(cell: SheetCell | null | undefined): string {
  const v = cell?.v;
  return v === null || v === undefined ? "" : String(v).trim();
}

export function sheetOf(snapshot: unknown, sheetId: string): SheetLike | null {
  if (!snapshot || typeof snapshot !== "object") return null;
  const sheets = (snapshot as WorkbookLike).sheets;
  return sheets?.[sheetId] ?? null;
}

/** Read one sheet: its header row and every non-empty body row, with the id column's ids. */
export function parseSheet(snapshot: unknown, sheetId: string): ParsedSheet | null {
  const sheet = sheetOf(snapshot, sheetId);
  if (!sheet) return null;
  const cellData = sheet.cellData ?? {};
  const headers = new Map<number, string>();
  let maxCol = -1;
  for (const [c, cell] of Object.entries(cellData["0"] ?? {})) {
    const text = cellText(cell);
    if (text) {
      headers.set(Number(c), text);
      maxCol = Math.max(maxCol, Number(c));
    }
  }
  const idCol = [...headers.entries()].find(([, h]) => h === RECORD_ID_HEADER)?.[0] ?? null;
  const rows: ParsedRow[] = [];
  const rowKeys = Object.keys(cellData).map(Number).filter((r) => Number.isInteger(r) && r > 0).sort((a, b) => a - b);
  for (const r of rowKeys) {
    const source = cellData[String(r)] ?? {};
    const cells: Record<number, SheetCell | null | undefined> = {};
    let any = false;
    for (const [c, cell] of Object.entries(source)) {
      const col = Number(c);
      if (!Number.isInteger(col)) continue;
      cells[col] = cell;
      if (cellText(cell) !== "") {
        any = true;
        maxCol = Math.max(maxCol, col);
      }
    }
    if (!any) continue;
    const id = idCol === null ? null : cellText(cells[idCol]) || null;
    rows.push({ row: r, id, cells });
  }
  return { sheetId, sheetName: sheet.name ?? "Sheet1", headers, rows, maxCol };
}

/** "A", "B", … "AA" for a 0-based column. */
export function columnLetter(col: number): string {
  let n = col + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}
