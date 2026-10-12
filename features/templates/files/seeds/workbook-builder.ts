/**
 * Seed builder for featured spreadsheet templates: a compact spec → a Univer
 * IWorkbookData snapshot with the add-ons the editor ships (frozen header,
 * header filter, dropdowns, checkboxes, conditional formats, number formats,
 * formulas with their computed values). Pure — no Univer runtime.
 */

export type Fmt = "currency" | "currency0" | "date" | "percent" | "int" | "decimal" | "time";
export const PATTERNS: Record<Fmt, string> = {
  currency: '"$"#,##0.00',
  currency0: '"$"#,##0',
  date: "mmm d, yyyy",
  percent: "0%",
  int: "#,##0",
  decimal: "#,##0.00",
  time: "h:mm AM/PM",
};

export type Style = {
  bg?: string;
  cl?: string;
  bl?: boolean;
  it?: boolean;
  fs?: number;
  ht?: "left" | "center" | "right";
  fmt?: Fmt;
  border?: boolean;
};
export type Formula = { f: string; v: number | string };
export type CellIn = string | number | null | undefined | Formula | { v: string | number; s: Style } | { f: string; v: number | string; s: Style };

export type Column = {
  header: string;
  width: number;
  fmt?: Fmt;
  align?: "left" | "center" | "right";
  list?: string[];
  checkbox?: boolean;
  date?: boolean;
};

export type CfRule =
  | { col: number; kind: "number"; op: "greaterThan" | "lessThan" | "equal" | "between" | "greaterThanOrEqual" | "lessThanOrEqual"; value: number | [number, number]; bg: string; cl?: string; toCol?: number }
  | { col: number; kind: "text"; op: "equal" | "containsText"; value: string; bg: string; cl?: string; toCol?: number };

export type SheetSpec = {
  name: string;
  accent: string;
  /** A title band above the table (Google's templates open with one). */
  title?: string;
  subtitle?: string;
  /** Extra free cells above the table (summary blocks), as [row, col, cell]. Rows count from 0. */
  above?: Array<[number, number, CellIn]>;
  /** Row the header sits on (default: 3 with a title, else 0). */
  headerRow?: number;
  columns: Column[];
  rows: CellIn[][];
  /** Cells below the table (totals), as [rowOffsetAfterLastRow, col, cell]. */
  below?: Array<[number, number, CellIn]>;
  cf?: CfRule[];
  banded?: boolean;
  filter?: boolean;
  /** Blank, validated rows kept after the data so the list is ready to grow. */
  spareRows?: number;
  merges?: Array<[number, number, number, number]>;
  rowHeights?: Record<number, number>;
  gridlines?: boolean;
};

type UStyle = Record<string, unknown>;

export function serial(iso: string): number {
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.UTC(1899, 11, 30)) / 86400000);
}

export function colName(c: number): string {
  let s = "";
  let n = c + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function tint(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const HT = { left: 1, center: 2, right: 3 } as const;
const THIN = { s: 1, cl: { rgb: "#dadce0" } };

function toUniverStyle(s: Style): UStyle {
  const out: UStyle = {};
  if (s.bg) out.bg = { rgb: s.bg };
  if (s.cl) out.cl = { rgb: s.cl };
  if (s.bl) out.bl = 1;
  if (s.it) out.it = 1;
  if (s.fs) out.fs = s.fs;
  if (s.ht) out.ht = HT[s.ht];
  if (s.fmt) out.n = { pattern: PATTERNS[s.fmt] };
  if (s.border) out.bd = { b: THIN, t: THIN, l: THIN, r: THIN };
  out.vt = 2;
  return out;
}

class StyleBook {
  styles: Record<string, UStyle> = {};
  private keys = new Map<string, string>();
  id(s: Style): string {
    const u = toUniverStyle(s);
    const key = JSON.stringify(u);
    let id = this.keys.get(key);
    if (!id) {
      id = `st${this.keys.size + 1}`;
      this.keys.set(key, id);
      this.styles[id] = u;
    }
    return id;
  }
}

type UCell = { v?: string | number; f?: string; t?: number; s?: string };

function cell(input: CellIn, base: Style, book: StyleBook): UCell | null {
  if (input === null || input === undefined || input === "") {
    return Object.keys(base).length ? { s: book.id(base) } : null;
  }
  if (typeof input === "string") return { v: input, t: 1, s: book.id(base) };
  if (typeof input === "number") return { v: input, t: 2, s: book.id(base) };
  const style = "s" in input ? { ...base, ...input.s } : base;
  const out: UCell = { v: input.v, t: typeof input.v === "number" ? 2 : 1, s: book.id(style) };
  if ("f" in input && input.f) out.f = input.f;
  return out;
}

export function buildWorkbook(name: string, sheets: SheetSpec[]): Record<string, unknown> {
  const book = new StyleBook();
  const sheetOrder: string[] = [];
  const out: Record<string, unknown> = {};
  const dv: Record<string, unknown[]> = {};
  const cfRes: Record<string, unknown[]> = {};
  const filters: Record<string, unknown> = {};
  sheets.forEach((spec, si) => {
    const id = `sheet-${si + 1}`;
    sheetOrder.push(id);
    const cellData: Record<number, Record<number, UCell>> = {};
    const put = (r: number, c: number, v: UCell | null) => {
      if (!v) return;
      (cellData[r] ??= {})[c] = v;
    };
    const merges: Array<{ startRow: number; endRow: number; startColumn: number; endColumn: number }> = [];
    const width = spec.columns.length;
    const hr = spec.headerRow ?? (spec.title ? 3 : 0);
    if (spec.title) {
      put(0, 0, cell(spec.title, { fs: 20, bl: true, cl: spec.accent }, book));
      merges.push({ startRow: 0, endRow: 0, startColumn: 0, endColumn: Math.max(width - 1, 0) });
      if (spec.subtitle) {
        put(1, 0, cell(spec.subtitle, { fs: 10, cl: "#5f6368" }, book));
        merges.push({ startRow: 1, endRow: 1, startColumn: 0, endColumn: Math.max(width - 1, 0) });
      }
    }
    for (const [r, c, v] of spec.above ?? []) put(r, c, cell(v, {}, book));
    spec.columns.forEach((col, c) =>
      put(hr, c, cell(col.header, { bg: spec.accent, cl: "#ffffff", bl: true, ht: col.align ?? (col.checkbox ? "center" : "left") }, book)),
    );
    const band = tint(spec.accent, 0.92);
    const spare = spec.spareRows ?? 0;
    const total = spec.rows.length + spare;
    for (let i = 0; i < total; i++) {
      const r = hr + 1 + i;
      const row = spec.rows[i] ?? [];
      spec.columns.forEach((col, c) => {
        const base: Style = {
          ...(spec.banded !== false && i % 2 === 1 ? { bg: band } : {}),
          ...(col.fmt ? { fmt: col.fmt } : {}),
          ...(col.align ? { ht: col.align } : col.checkbox ? { ht: "center" } : {}),
        };
        const v = row[c];
        if (col.checkbox && (v === 1 || v === 0)) put(r, c, { v, t: 2, s: book.id(base) });
        else if (col.checkbox && (v === undefined || v === null)) put(r, c, { v: 0, t: 2, s: book.id(base) });
        else put(r, c, cell(v, base, book));
      });
    }
    const last = hr + total;
    for (const [off, c, v] of spec.below ?? []) put(last + 1 + off, c, cell(v, {}, book));
    for (const [r1, c1, r2, c2] of spec.merges ?? []) merges.push({ startRow: r1, endRow: r2, startColumn: c1, endColumn: c2 });

    const rules: unknown[] = [];
    spec.columns.forEach((col, c) => {
      const range = [{ startRow: hr + 1, endRow: last, startColumn: c, endColumn: c }];
      const base = { uid: `tpl-${si}-${c}`, ranges: range, allowBlank: true, errorStyle: 2, showErrorMessage: true };
      if (col.list) rules.push({ ...base, type: "list", formula1: col.list.join(","), showDropDown: true, renderMode: 1 });
      else if (col.checkbox) rules.push({ ...base, type: "checkbox" });
      else if (col.date) rules.push({ ...base, type: "date", operator: "greaterThan", formula1: "1900-01-01" });
    });
    if (rules.length) dv[id] = rules;
    if (spec.cf?.length) {
      cfRes[id] = spec.cf.map((r, k) => ({
        cfId: `tpl-cf-${si}-${k}`,
        stopIfTrue: false,
        ranges: [{ startRow: hr + 1, endRow: last, startColumn: r.col, endColumn: r.toCol ?? r.col }],
        rule: {
          type: "highlightCell",
          subType: r.kind,
          operator: r.op,
          value: r.value,
          style: { bg: { rgb: r.bg }, ...(r.cl ? { cl: { rgb: r.cl } } : {}) },
        },
      }));
    }
    if (spec.filter !== false) {
      filters[id] = {
        ref: { startRow: hr, startColumn: 0, endRow: last, endColumn: width - 1, rangeType: 0 },
        filterColumns: [],
        cachedFilteredOut: [],
      };
    }
    const columnData: Record<number, { w: number }> = {};
    spec.columns.forEach((col, c) => (columnData[c] = { w: col.width }));
    const rowData: Record<number, { h: number }> = {};
    if (spec.title) rowData[0] = { h: 40 };
    rowData[hr] = { h: 30 };
    for (const [r, h] of Object.entries(spec.rowHeights ?? {})) rowData[Number(r)] = { h };
    out[id] = {
      id,
      name: spec.name,
      tabColor: spec.accent,
      hidden: 0,
      rowCount: Math.max(last + 50, 100),
      columnCount: Math.max(width + 4, 26),
      freeze: { xSplit: 0, ySplit: hr + 1, startRow: hr + 1, startColumn: 0 },
      zoomRatio: 1,
      scrollTop: 0,
      scrollLeft: 0,
      defaultColumnWidth: 88,
      defaultRowHeight: 24,
      mergeData: merges,
      cellData,
      rowData,
      columnData,
      showGridlines: spec.gridlines === false ? 0 : 1,
      rowHeader: { width: 46, hidden: 0 },
      columnHeader: { height: 20, hidden: 0 },
      rightToLeft: 0,
    };
  });
  return {
    id: `tpl-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    name,
    appVersion: "1",
    locale: "enUS",
    styles: book.styles,
    sheetOrder,
    sheets: out,
    resources: [
      { name: "SHEET_DATA_VALIDATION_PLUGIN", data: JSON.stringify(dv) },
      { name: "SHEET_CONDITIONAL_FORMATTING_PLUGIN", data: JSON.stringify(cfRes) },
      { name: "SHEET_FILTER_PLUGIN", data: JSON.stringify(filters) },
    ],
  };
}

/** A formula with its computed value (the seed computes it so previews and the first paint agree). */
export const fx = (f: string, v: number | string): Formula => ({ f, v });
export const styled = (v: string | number, s: Style) => ({ v, s });
