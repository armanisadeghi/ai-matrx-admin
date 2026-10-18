/**
 * Pure logic behind the Sheets menu rows that were "Coming soon" in the second round:
 * Spreadsheet settings, Data extraction, Timeline, Filter views, Named functions, Data connectors
 * (CSV) and the Tools preferences. No Univer import — the structural facade types are declared here —
 * so every function is tested directly (`__tests__/sheet-row-extras.test.ts`).
 */

import { parseDelimited } from "@ai-matrx/kit/delimited";

// ─── Spreadsheet settings ───

export type Recalculation = "on-change" | "on-change-and-minute" | "on-change-and-hour";

export interface SheetSettings {
  /** BCP 47 tag the workbook's own computed text (Column stats, Timeline, extraction dates) is written in. */
  locale: string;
  /** IANA zone the Timeline buckets dates in and "Last calculated" is shown in. */
  timeZone: string;
  recalculation: Recalculation;
}

export const SETTINGS_LOCALES: { value: string; label: string }[] = [
  { value: "en-US", label: "United States" },
  { value: "en-GB", label: "United Kingdom" },
  { value: "en-CA", label: "Canada (English)" },
  { value: "en-AU", label: "Australia" },
  { value: "fr-FR", label: "France" },
  { value: "de-DE", label: "Germany" },
  { value: "es-ES", label: "Spain" },
  { value: "es-MX", label: "Mexico" },
  { value: "it-IT", label: "Italy" },
  { value: "pt-BR", label: "Brazil" },
  { value: "ja-JP", label: "Japan" },
  { value: "zh-CN", label: "China" },
  { value: "hi-IN", label: "India" },
];

export const SETTINGS_TIME_ZONES: string[] = [
  "America/Los_Angeles",
  "America/Denver",
  "America/Chicago",
  "America/New_York",
  "America/Sao_Paulo",
  "UTC",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Africa/Johannesburg",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export const RECALCULATION_OPTIONS: { value: Recalculation; label: string }[] = [
  { value: "on-change", label: "On change" },
  { value: "on-change-and-minute", label: "On change and every minute" },
  { value: "on-change-and-hour", label: "On change and every hour" },
];

const isZone = (z: unknown): z is string => {
  if (typeof z !== "string" || !z) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: z });
    return true;
  } catch {
    return false;
  }
};
const isLocale = (l: unknown): l is string => {
  if (typeof l !== "string" || !l) return false;
  try {
    return Intl.NumberFormat.supportedLocalesOf(l).length > 0;
  } catch {
    return false;
  }
};

export function defaultSettings(): SheetSettings {
  const zone = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC";
  return { locale: "en-US", timeZone: isZone(zone) ? zone : "UTC", recalculation: "on-change" };
}

/** What was saved, made safe: anything unreadable falls back to the default for that field. */
export function normalizeSettings(raw: unknown): SheetSettings {
  const d = defaultSettings();
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    locale: isLocale(r.locale) ? r.locale : d.locale,
    timeZone: isZone(r.timeZone) ? r.timeZone : d.timeZone,
    recalculation: RECALCULATION_OPTIONS.some((o) => o.value === r.recalculation) ? (r.recalculation as Recalculation) : d.recalculation,
  };
}

/** How often the formulas are recalculated on a timer; `null` is only when something changes. */
export function recalcIntervalMs(r: Recalculation): number | null {
  if (r === "on-change-and-minute") return 60_000;
  if (r === "on-change-and-hour") return 3_600_000;
  return null;
}

// ─── Data extraction ───

export const EXTRACTORS = [
  { id: "email", label: "Email addresses", pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi },
  { id: "url", label: "Web links", pattern: /\bhttps?:\/\/[^\s<>"')]+/gi },
  { id: "phone", label: "Phone numbers", pattern: /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g },
  { id: "date", label: "Dates", pattern: /\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})\b/g },
  { id: "amount", label: "Amounts of money", pattern: /[$€£]\s?\d[\d,]*(?:\.\d+)?/g },
  { id: "hashtag", label: "Hashtags", pattern: /#[A-Za-z0-9_]+/g },
  { id: "mention", label: "@mentions", pattern: /(?<![A-Za-z0-9._%+-])@[A-Za-z0-9_]+/g },
] as const;

export type ExtractorId = (typeof EXTRACTORS)[number]["id"];

export interface Extraction {
  headers: string[];
  /** One row per input row; a field with several matches joins them with ", ". */
  rows: string[][];
  /** How many cells held at least one match. */
  matched: number;
}

/** Pull the chosen kinds of fields out of the text of one column, one output column per kind. */
export function extractFields(column: unknown[], kinds: readonly ExtractorId[]): Extraction {
  const chosen = EXTRACTORS.filter((e) => kinds.includes(e.id));
  let matched = 0;
  const rows = column.map((cell) => {
    const text = cell === null || cell === undefined ? "" : String(cell);
    let any = false;
    const out = chosen.map((e) => {
      const hits = [...new Set(text.match(new RegExp(e.pattern.source, e.pattern.flags)) ?? [])];
      if (hits.length) any = true;
      return hits.join(", ");
    });
    if (any) matched += 1;
    return out;
  });
  return { headers: chosen.map((e) => e.label), rows, matched };
}

// ─── Timeline ───

export interface TimelineItem {
  /** ISO calendar day (yyyy-mm-dd) in the settings' time zone. */
  day: string;
  title: string;
  /** 0-based row in the source range. */
  row: number;
}

export interface Timeline {
  items: TimelineItem[];
  dateColumn: number;
  titleColumn: number | null;
  months: { month: string; items: TimelineItem[] }[];
}

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

/** A cell as a calendar day: an Excel serial number, an ISO date or an m/d/yyyy text; otherwise null. */
export function cellAsDay(v: unknown): string | null {
  if (typeof v === "number" && Number.isFinite(v) && v >= 20000 && v <= 80000) {
    return new Date(EXCEL_EPOCH_MS + Math.floor(v) * 86_400_000).toISOString().slice(0, 10);
  }
  if (typeof v !== "string") return null;
  const t = v.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ].*)?$/.exec(t);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(t);
  if (us) {
    const [, m, d, y] = us;
    const year = y!.length === 2 ? 2000 + Number(y) : Number(y);
    const mm = Number(m);
    const dd = Number(d);
    if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    return `${year}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }
  return null;
}

/**
 * Rows with dates → a timeline: the column whose cells most read as dates is the date column, the
 * first mostly-text column left of or beside it titles each entry. `null` when no column reads as dates.
 */
export function buildTimeline(values: unknown[][], display: unknown[][] = values, locale = "en-US"): Timeline | null {
  if (!values.length) return null;
  const width = values.reduce((w, r) => Math.max(w, r.length), 0);
  const header = values.length > 1 && values[0]!.every((v) => v === null || v === undefined || v === "" || (typeof v === "string" && cellAsDay(v) === null && Number.isNaN(Number(v))));
  const start = header ? 1 : 0;
  let dateColumn = -1;
  let best = 0;
  for (let c = 0; c < width; c += 1) {
    let hits = 0;
    let filled = 0;
    for (let r = start; r < values.length; r += 1) {
      const v = values[r]![c];
      if (v === null || v === undefined || v === "") continue;
      filled += 1;
      if (cellAsDay(v) ?? cellAsDay(display[r]?.[c])) hits += 1;
    }
    if (filled > 0 && hits / filled >= 0.7 && hits > best) {
      best = hits;
      dateColumn = c;
    }
  }
  if (dateColumn < 0) return null;
  let titleColumn: number | null = null;
  for (let c = 0; c < width; c += 1) {
    if (c === dateColumn) continue;
    const texts = values.slice(start).filter((r) => typeof r[c] === "string" && String(r[c]).trim() !== "").length;
    if (texts > 0) {
      titleColumn = c;
      break;
    }
  }
  const items: TimelineItem[] = [];
  for (let r = start; r < values.length; r += 1) {
    const day = cellAsDay(values[r]![dateColumn]) ?? cellAsDay(display[r]?.[dateColumn]);
    if (!day) continue;
    const title = titleColumn === null ? `Row ${r + 1}` : String(display[r]?.[titleColumn] ?? values[r]![titleColumn] ?? "").trim() || `Row ${r + 1}`;
    items.push({ day, title, row: r });
  }
  items.sort((a, b) => a.day.localeCompare(b.day) || a.row - b.row);
  const byMonth = new Map<string, TimelineItem[]>();
  for (const it of items) {
    const key = it.day.slice(0, 7);
    byMonth.set(key, [...(byMonth.get(key) ?? []), it]);
  }
  const months = [...byMonth.entries()].map(([key, list]) => ({
    month: new Date(`${key}-01T12:00:00Z`).toLocaleDateString(locale, { month: "long", year: "numeric", timeZone: "UTC" }),
    items: list,
  }));
  return { items, dateColumn, titleColumn, months };
}

/** A calendar day written for a person, in the workbook's locale. */
export function formatDay(day: string, locale = "en-US"): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString(locale, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

// ─── Named functions ───

export interface NamedFunction {
  name: string;
  args: string[];
  body: string;
}

const NAME_RE = /^[A-Za-z_][A-Za-z0-9_.]*$/;
const CELL_REF_RE = /^[A-Za-z]{1,3}[0-9]+$/;

/** A refusal in plain words, or null when the name can be used. */
export function namedFunctionNameProblem(name: string, existing: readonly string[]): string | null {
  if (!name.trim()) return "Give the function a name";
  if (!NAME_RE.test(name)) return "Use letters, numbers, underscores and dots, starting with a letter";
  if (CELL_REF_RE.test(name)) return "That looks like a cell address";
  if (existing.some((e) => e.toLowerCase() === name.toLowerCase())) return "A function or range already has that name";
  return null;
}

/** `LAMBDA(a, b, a+b)` the way the formula engine reads it. */
export function lambdaFormula(args: readonly string[], body: string): string {
  const parts = [...args.map((a) => a.trim()).filter(Boolean), body.trim().replace(/^=/, "")];
  return `=LAMBDA(${parts.join(", ")})`;
}

/** The named functions among a workbook's defined names: the ones that hold a LAMBDA. */
export function namedFunctionsFrom(names: readonly { name: string; formula: string }[]): NamedFunction[] {
  const out: NamedFunction[] = [];
  for (const n of names) {
    const m = /^=?\s*LAMBDA\s*\(([\s\S]*)\)\s*$/i.exec(n.formula.trim());
    if (!m) continue;
    const parts = splitTopLevel(m[1]!);
    const body = parts.pop() ?? "";
    out.push({ name: n.name, args: parts.map((p) => p.trim()), body: body.trim() });
  }
  return out;
}

function splitTopLevel(text: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote = false;
  let cur = "";
  for (const ch of text) {
    if (ch === '"') quote = !quote;
    if (!quote) {
      if (ch === "(") depth += 1;
      if (ch === ")") depth -= 1;
      if (ch === "," && depth === 0) {
        out.push(cur);
        cur = "";
        continue;
      }
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

// ─── CSV (Data connectors) ───

/** CSV / TSV / semicolon text → rows, through the platform's one reader (`@ai-matrx/kit/delimited`; it guesses the delimiter, honors quotes and a BOM). Numbers stay text here; `csvCell` types them. */
export function parseCsv(text: string): string[][] {
  return parseDelimited(text, { skipEmptyLines: "greedy" }).data;
}

/** One CSV field as a cell value: a plain number becomes a number, everything else stays text. */
export function csvCell(v: string): string | number {
  const t = v.trim();
  return t !== "" && /^-?\d+(\.\d+)?$/.test(t) ? Number(t) : v;
}

export interface SheetConnector {
  id: string;
  kind: "csv-url" | "table";
  label: string;
  /** csv-url: the address; table: the table's id. */
  source: string;
  sheetId: string;
  /** Top-left 0-based cell the data starts at. */
  row: number;
  column: number;
  refreshedAt: string | null;
}

export function normalizeConnectors(raw: unknown): SheetConnector[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (c): c is SheetConnector =>
      !!c && typeof c === "object" && typeof (c as SheetConnector).id === "string" && ["csv-url", "table"].includes((c as SheetConnector).kind) && typeof (c as SheetConnector).source === "string" && typeof (c as SheetConnector).sheetId === "string",
  );
}

// ─── Filter views ───

export interface FilterViewColumn {
  /** Absolute 0-based column. */
  column: number;
  /** Values that stay visible. */
  values: string[];
  blank: boolean;
}

export interface FilterView {
  id: string;
  name: string;
  sheetId: string;
  range: { startRow: number; endRow: number; startColumn: number; endColumn: number };
  columns: FilterViewColumn[];
}

export function normalizeFilterViews(raw: unknown): FilterView[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is FilterView => !!v && typeof v === "object" && typeof (v as FilterView).id === "string" && typeof (v as FilterView).name === "string" && !!(v as FilterView).range && Array.isArray((v as FilterView).columns));
}

export interface FilterLike {
  getRange(): { getRange(): FilterView["range"] };
  getColumnFilterCriteria(column: number): { filters?: { filters?: string[]; blank?: true } } | null | undefined;
  setColumnFilterCriteria(column: number, criteria: { colId: number; filters: { filters: string[]; blank?: true } }): unknown;
  remove(): unknown;
}

export interface FilterSheetLike {
  getSheetId(): string;
  getFilter(): FilterLike | null;
  getRange(row: number, col: number, rows: number, cols: number): { createFilter(): FilterLike | null };
}

/** The sheet's current filter as a view: its range and, per column, which values stay visible. Null when there is no filter. */
export function captureFilterView(sheet: FilterSheetLike, name: string, id: string): FilterView | null {
  const filter = sheet.getFilter();
  if (!filter) return null;
  const range = filter.getRange().getRange();
  const columns: FilterViewColumn[] = [];
  for (let c = range.startColumn; c <= range.endColumn; c += 1) {
    const crit = filter.getColumnFilterCriteria(c);
    const values = crit?.filters?.filters;
    if (values || crit?.filters?.blank) columns.push({ column: c, values: [...(values ?? [])], blank: !!crit?.filters?.blank });
  }
  return { id, name, sheetId: sheet.getSheetId(), range, columns };
}

/** Put a saved view on the sheet: the old filter goes, the saved range gets one, and each column's criteria come back. */
export function applyFilterView(sheet: FilterSheetLike, view: FilterView): boolean {
  sheet.getFilter()?.remove();
  const { startRow, endRow, startColumn, endColumn } = view.range;
  const filter = sheet.getRange(startRow, startColumn, endRow - startRow + 1, endColumn - startColumn + 1).createFilter();
  if (!filter) return false;
  for (const col of view.columns) {
    filter.setColumnFilterCriteria(col.column, { colId: col.column, filters: { filters: col.values, ...(col.blank ? { blank: true as const } : {}) } });
  }
  return true;
}

// ─── Saved macros ───

export interface SheetMacro {
  id: string;
  name: string;
  commands: { id: string; params?: unknown }[];
  savedAt: string;
}

export function normalizeMacros(raw: unknown): SheetMacro[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (m): m is SheetMacro => !!m && typeof m === "object" && typeof (m as SheetMacro).id === "string" && typeof (m as SheetMacro).name === "string" && Array.isArray((m as SheetMacro).commands),
  );
}

// ─── Tools preferences (Autocomplete, Suggestion controls) ───

export interface SheetPrefs {
  /** The function-name list that opens as you type "=". */
  functionSuggestions: boolean;
  /** The argument hint under the cell while you write a formula. */
  formulaHints: boolean;
  /** Tools → Autocomplete: a value already in the column is offered as you type text (Tab takes it). */
  columnAutocomplete: boolean;
}

export function normalizePrefs(raw: unknown): SheetPrefs {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  // `autocomplete` is what the function-name list was saved as before Autocomplete became its own setting.
  return { functionSuggestions: (r.functionSuggestions ?? r.autocomplete) !== false, formulaHints: r.formulaHints !== false, columnAutocomplete: r.columnAutocomplete !== false };
}

// ─── Protect panel title ───

export interface ProtectTarget {
  /** Univer UnitObject: 2 = whole sheet, 3 = a range. */
  unitType?: number;
  range?: { startRow: number; endRow: number; startColumn: number; endColumn: number; rangeType?: number } | null;
}

/** The side panel's title for what is being protected (Univer's own is always "Protect Rows and Columns"). */
export function protectPanelTitle(t: ProtectTarget): string {
  if (t.unitType === 2) return "Protect sheet";
  const r = t.range;
  if (!r) return "Protect range";
  if (r.rangeType === 1) return r.startRow === r.endRow ? "Protect row" : "Protect rows";
  if (r.rangeType === 2) return r.startColumn === r.endColumn ? "Protect column" : "Protect columns";
  if (r.startRow === r.endRow && r.startColumn === r.endColumn) return "Protect cell";
  return "Protect range";
}
