/**
 * Sheets menu rows that were "Coming soon" and are now real: Column stats and Theme.
 * Pure functions over the structural facade types in `sheet-commands.ts`, so the
 * logic is tested without Univer (`__tests__/sheet-column-stats-and-theme.test.ts`).
 */

export interface ColumnStats {
  /** 1-based position inside the selection. */
  column: number;
  filled: number;
  blank: number;
  unique: number;
  numeric: number;
  sum: number | null;
  min: number | null;
  max: number | null;
  mean: number | null;
  top: { value: string; count: number }[];
}

const isBlank = (v: unknown) => v === null || v === undefined || (typeof v === "string" && v.trim() === "");
const asNumber = (v: unknown): number | null => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
};

/** Counts, distribution and common values for every column of a block of cells. */
export function columnStats(values: unknown[][], opts: { topN?: number } = {}): ColumnStats[] {
  const topN = opts.topN ?? 5;
  const width = values.reduce((w, row) => Math.max(w, row.length), 0);
  const out: ColumnStats[] = [];
  for (let c = 0; c < width; c += 1) {
    const counts = new Map<string, number>();
    let filled = 0;
    let blank = 0;
    const nums: number[] = [];
    for (const row of values) {
      const v = row[c];
      if (isBlank(v)) {
        blank += 1;
        continue;
      }
      filled += 1;
      const key = String(v);
      counts.set(key, (counts.get(key) ?? 0) + 1);
      const n = asNumber(v);
      if (n !== null) nums.push(n);
    }
    const sum = nums.reduce((a, b) => a + b, 0);
    out.push({
      column: c + 1,
      filled,
      blank,
      unique: counts.size,
      numeric: nums.length,
      sum: nums.length ? sum : null,
      min: nums.length ? Math.min(...nums) : null,
      max: nums.length ? Math.max(...nums) : null,
      mean: nums.length ? sum / nums.length : null,
      top: [...counts.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, topN)
        .map(([value, count]) => ({ value, count })),
    });
  }
  return out;
}

const fmt = (n: number | null) => (n === null ? "-" : Number.isInteger(n) ? String(n) : n.toFixed(2));

/** Plain-text report of `columnStats`, one block per column (the confirm dialog renders line breaks). */
export function describeColumnStats(stats: ColumnStats[], headers?: unknown[]): string {
  return stats
    .map((s) => {
      const name = headers && !isBlank(headers[s.column - 1]) ? `${String(headers[s.column - 1])}` : `Column ${s.column}`;
      const lines = [`${name}: ${s.filled} filled, ${s.blank} blank, ${s.unique} unique`];
      if (s.numeric) lines.push(`Numbers: sum ${fmt(s.sum)}, min ${fmt(s.min)}, max ${fmt(s.max)}, mean ${fmt(s.mean)}`);
      if (s.top.length) lines.push(`Most common: ${s.top.map((t) => `${t.value} (${t.count})`).join(", ")}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

// ─── Theme ───

export interface SheetTheme {
  id: string;
  label: string;
  font: string;
  headerFill: string;
  headerText: string;
  bodyText: string;
  /** Alternating-row tint, or null for none. */
  band: string | null;
}

/** Google Sheets' theme gallery, as fonts + colours applied to every sheet's data. */
export const SHEET_THEMES: SheetTheme[] = [
  { id: "simple", label: "Simple", font: "Arial", headerFill: "#ffffff", headerText: "#000000", bodyText: "#000000", band: null },
  { id: "classic", label: "Classic", font: "Times New Roman", headerFill: "#d9d9d9", headerText: "#000000", bodyText: "#000000", band: null },
  { id: "modern", label: "Modern", font: "Roboto", headerFill: "#1a73e8", headerText: "#ffffff", bodyText: "#202124", band: "#e8f0fe" },
  { id: "forest", label: "Forest", font: "Georgia", headerFill: "#1e6b3a", headerText: "#ffffff", bodyText: "#1b2b21", band: "#e6f4ea" },
  { id: "sunset", label: "Sunset", font: "Verdana", headerFill: "#e8710a", headerText: "#ffffff", bodyText: "#3c2a1e", band: "#fef0e0" },
  { id: "midnight", label: "Midnight", font: "Courier New", headerFill: "#202124", headerText: "#e8eaed", bodyText: "#202124", band: "#f1f3f4" },
];

export interface ThemeRangeLike {
  setFontFamily(f: string | null): unknown;
  setFontColor(c: string | null): unknown;
  setBackground(c: string): unknown;
  setFontWeight(w: "bold" | "normal" | null): unknown;
}

/**
 * Apply a theme to one sheet. `getRange(row, col, rows, cols)` is 0-based like the Univer facade;
 * `rows`/`cols` are the sheet's used size. Returns the number of cells restyled.
 */
export function applyThemeToSheet(
  theme: SheetTheme,
  getRange: (row: number, col: number, rows: number, cols: number) => ThemeRangeLike,
  rows: number,
  cols: number,
): number {
  if (rows < 1 || cols < 1) return 0;
  const body = getRange(0, 0, rows, cols);
  body.setFontFamily(theme.font);
  body.setFontColor(theme.bodyText);
  body.setFontWeight("normal");
  if (theme.band) {
    for (let r = 2; r < rows; r += 2) getRange(r, 0, 1, cols).setBackground(theme.band);
  }
  const head = getRange(0, 0, 1, cols);
  head.setBackground(theme.headerFill);
  head.setFontColor(theme.headerText);
  head.setFontWeight("bold");
  return rows * cols;
}
