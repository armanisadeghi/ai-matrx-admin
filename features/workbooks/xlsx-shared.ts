/**
 * Shared vocabulary between the xlsx importer and exporter: how Univer's
 * style numbers, colours and units map to the xlsx file's.
 *
 * Univer enums are written as numbers here so these helpers stay free of any
 * Univer import (they run in tests and in both directions).
 */

export const RESOURCE = {
  validation: "SHEET_DATA_VALIDATION_PLUGIN",
  conditional: "SHEET_CONDITIONAL_FORMATTING_PLUGIN",
  filter: "SHEET_FILTER_PLUGIN",
  note: "SHEET_NOTE_PLUGIN",
  comments: "SHEET_UNIVER_THREAD_COMMENT_PLUGIN",
  drawing: "SHEET_DRAWING_PLUGIN",
  table: "SHEET_TABLE_PLUGIN",
} as const;

export type UniverResource = { name: string; data: string };

export function readResource<T = unknown>(
  resources: readonly UniverResource[] | undefined,
  name: string,
): T | undefined {
  const raw = resources?.find((r) => r.name === name)?.data;
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function writeResource(resources: UniverResource[], name: string, value: unknown): void {
  const i = resources.findIndex((r) => r.name === name);
  const entry = { name, data: JSON.stringify(value) };
  if (i >= 0) resources[i] = entry;
  else resources.push(entry);
}

/** Excel column width (characters) <-> Univer pixels. */
export const colPxToChars = (px: number): number => Math.max(0, Math.round((px / 7) * 100) / 100);
export const colCharsToPx = (chars: number): number => Math.round(chars * 7);
/** Excel row height (points) <-> Univer pixels. */
export const rowPxToPt = (px: number): number => Math.round(px * 0.75 * 100) / 100;
export const rowPtToPx = (pt: number): number => Math.round((pt / 0.75) * 100) / 100;

/** Univer colour ("#rrggbb", "rgb(r,g,b)", "rgba(...)") -> ARGB hex, or undefined. */
export function colorToArgb(input: string | undefined | null): string | undefined {
  if (!input) return undefined;
  const s = input.trim();
  const hex = /^#?([0-9a-f]{6})$/i.exec(s);
  if (hex) return `FF${hex[1]!.toUpperCase()}`;
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(s);
  if (short) return `FF${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toUpperCase();
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(s);
  if (rgb) {
    const h = (n: string) => Number(n).toString(16).padStart(2, "0");
    return `FF${h(rgb[1]!)}${h(rgb[2]!)}${h(rgb[3]!)}`.toUpperCase();
  }
  return undefined;
}

/** ARGB (or RGB) hex from a file -> Univer "#rrggbb". */
export function argbToColor(argb: string | undefined | null): string | undefined {
  if (!argb) return undefined;
  const v = argb.replace(/^#/, "");
  if (v.length === 8) return `#${v.slice(2).toLowerCase()}`;
  if (v.length === 6) return `#${v.toLowerCase()}`;
  return undefined;
}

// Univer BorderStyleTypes number <-> ExcelJS border style name.
const BORDER_OUT: Record<number, string> = {
  1: "thin", 2: "hair", 3: "dotted", 4: "dashed", 5: "dashDot", 6: "dashDotDot", 7: "double",
  8: "medium", 9: "mediumDashed", 10: "mediumDashDot", 11: "mediumDashDotDot", 12: "slantDashDot", 13: "thick",
};
export const borderToExcel = (n: number | undefined): string | undefined =>
  n === undefined ? undefined : BORDER_OUT[n];
export const borderFromExcel = (name: string | undefined): number | undefined => {
  if (!name) return undefined;
  const hit = Object.entries(BORDER_OUT).find(([, v]) => v === name);
  return hit ? Number(hit[0]) : undefined;
};

export const H_ALIGN_OUT: Record<number, string> = { 1: "left", 2: "center", 3: "right", 4: "justify", 5: "justify", 6: "distributed" };
export const V_ALIGN_OUT: Record<number, string> = { 1: "top", 2: "middle", 3: "bottom" };
export const H_ALIGN_IN: Record<string, number> = { left: 1, center: 2, right: 3, justify: 4, fill: 1, centerContinuous: 2, distributed: 6 };
export const V_ALIGN_IN: Record<string, number> = { top: 1, middle: 2, bottom: 3, distributed: 2, justify: 2 };

/** 0-based (row, col) -> "A1" (no $). */
export function a1(row: number, col: number): string {
  let n = col + 1;
  let letters = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    letters = String.fromCharCode(65 + m) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return `${letters}${row + 1}`;
}

export type RangeLike = { startRow: number; endRow: number; startColumn: number; endColumn: number };
export const rangeToA1 = (r: RangeLike): string =>
  r.startRow === r.endRow && r.startColumn === r.endColumn
    ? a1(r.startRow, r.startColumn)
    : `${a1(r.startRow, r.startColumn)}:${a1(r.endRow, r.endColumn)}`;

/** "A1" or "A1:C5" -> range (0-based), or null. */
export function parseA1Range(ref: string): RangeLike | null {
  const m = /^\$?([A-Z]+)\$?(\d+)(?::\$?([A-Z]+)\$?(\d+))?$/i.exec(ref.trim());
  if (!m) return null;
  const col = (s: string) => [...s.toUpperCase()].reduce((acc, ch) => acc * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  const sc = col(m[1]!);
  const sr = Number(m[2]!) - 1;
  return { startRow: sr, startColumn: sc, endRow: m[4] ? Number(m[4]) - 1 : sr, endColumn: m[3] ? col(m[3]) : sc };
}
