/**
 * A workbook's print settings — Google Sheets' File → Page setup / Print, as pure data and pure
 * pagination (no React, no IO). They live on the workbook (`udt_workbooks.metadata.page_setup`),
 * so Print, Download as PDF and the Page setup dialog all read the same values.
 *
 * Geometry is in 96-dpi CSS pixels, like the rest of the document stack (`PX_PER_INCH`).
 */

import { PAPER_SIZES, PX_PER_INCH, type PaperSizeName } from "@/features/documents/document-page-style";

export const SHEET_SCALES = ["normal", "width", "height", "page"] as const;
export type SheetScale = (typeof SHEET_SCALES)[number];
export const SHEET_MARGIN_PRESETS = ["normal", "narrow", "wide", "custom"] as const;
export type SheetMarginPreset = (typeof SHEET_MARGIN_PRESETS)[number];
export const SHEET_PRINT_SCOPES = ["sheet", "workbook", "selection"] as const;
export type SheetPrintScope = (typeof SHEET_PRINT_SCOPES)[number];
export type SheetPageOrder = "down-over" | "over-down";
export type SheetAlignH = "left" | "center" | "right";
export type SheetAlignV = "top" | "middle" | "bottom";

export interface SheetPageSetup {
  paper: PaperSizeName;
  orientation: "portrait" | "landscape";
  scale: SheetScale;
  margins: SheetMarginPreset;
  /** Inches; read only when `margins` is "custom". */
  customMargins: { top: number; bottom: number; left: number; right: number };
  scope: SheetPrintScope;
  gridlines: boolean;
  repeatFrozenRows: boolean;
  repeatFrozenColumns: boolean;
  pageOrder: SheetPageOrder;
  alignH: SheetAlignH;
  alignV: SheetAlignV;
}

/** Google Sheets' defaults: Letter, portrait, 100%, normal margins, current sheet, gridlines on. */
export const DEFAULT_SHEET_PAGE_SETUP: SheetPageSetup = {
  paper: "Letter",
  orientation: "portrait",
  scale: "normal",
  margins: "normal",
  customMargins: { top: 0.75, bottom: 0.75, left: 0.7, right: 0.7 },
  scope: "sheet",
  gridlines: true,
  repeatFrozenRows: false,
  repeatFrozenColumns: false,
  pageOrder: "down-over",
  alignH: "left",
  alignV: "top",
};

/** Google's three preset margins, in inches. */
export const MARGIN_PRESET_INCHES: Record<Exclude<SheetMarginPreset, "custom">, { top: number; bottom: number; left: number; right: number }> = {
  normal: { top: 0.75, bottom: 0.75, left: 0.7, right: 0.7 },
  narrow: { top: 0.25, bottom: 0.25, left: 0.25, right: 0.25 },
  wide: { top: 1, bottom: 1, left: 1, right: 1 },
};

const isPaper = (v: unknown): v is PaperSizeName => typeof v === "string" && v in PAPER_SIZES;
const oneOf = <T extends string>(list: readonly T[], v: unknown, fallback: T): T => (typeof v === "string" && (list as readonly string[]).includes(v) ? (v as T) : fallback);
const inches = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 5 ? v : fallback);

/** Any stored value → a complete, valid setup. Unknown or broken parts fall back to the default. */
export function normalizeSheetPageSetup(raw: unknown): SheetPageSetup {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const m = (r.customMargins && typeof r.customMargins === "object" ? r.customMargins : {}) as Record<string, unknown>;
  const d = DEFAULT_SHEET_PAGE_SETUP;
  return {
    paper: isPaper(r.paper) ? r.paper : d.paper,
    orientation: r.orientation === "landscape" ? "landscape" : "portrait",
    scale: oneOf(SHEET_SCALES, r.scale, d.scale),
    margins: oneOf(SHEET_MARGIN_PRESETS, r.margins, d.margins),
    customMargins: {
      top: inches(m.top, d.customMargins.top),
      bottom: inches(m.bottom, d.customMargins.bottom),
      left: inches(m.left, d.customMargins.left),
      right: inches(m.right, d.customMargins.right),
    },
    scope: oneOf(SHEET_PRINT_SCOPES, r.scope, d.scope),
    gridlines: typeof r.gridlines === "boolean" ? r.gridlines : d.gridlines,
    repeatFrozenRows: r.repeatFrozenRows === true,
    repeatFrozenColumns: r.repeatFrozenColumns === true,
    pageOrder: r.pageOrder === "over-down" ? "over-down" : "down-over",
    alignH: oneOf(["left", "center", "right"] as const, r.alignH, d.alignH),
    alignV: oneOf(["top", "middle", "bottom"] as const, r.alignV, d.alignV),
  };
}

/** The setup stored on a workbook's metadata (`metadata.page_setup`), complete and valid. */
export function pageSetupFromMetadata(metadata: unknown): SheetPageSetup {
  return normalizeSheetPageSetup((metadata as { page_setup?: unknown } | null)?.page_setup);
}

export interface PrintGeometry {
  /** Paper as printed (orientation applied), px. */
  paperWidth: number;
  paperHeight: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  marginRight: number;
  /** The printable box inside the margins, px. */
  areaWidth: number;
  areaHeight: number;
}

export function printGeometry(setup: SheetPageSetup): PrintGeometry {
  const base = PAPER_SIZES[setup.paper];
  const landscape = setup.orientation === "landscape";
  const paperWidth = landscape ? base.height : base.width;
  const paperHeight = landscape ? base.width : base.height;
  const m = setup.margins === "custom" ? setup.customMargins : MARGIN_PRESET_INCHES[setup.margins];
  const px = (n: number) => Math.round(n * PX_PER_INCH);
  const geometry = {
    paperWidth,
    paperHeight,
    marginTop: px(m.top),
    marginBottom: px(m.bottom),
    marginLeft: px(m.left),
    marginRight: px(m.right),
  };
  return {
    ...geometry,
    areaWidth: Math.max(48, paperWidth - geometry.marginLeft - geometry.marginRight),
    areaHeight: Math.max(48, paperHeight - geometry.marginTop - geometry.marginBottom),
  };
}

export const PRINT_ROW_HEIGHT = 22;
const MIN_COL = 48;
const MAX_COL = 320;
const CHAR_PX = 7;

/** Column widths (px) fitted to the text the column holds. */
export function printColumnWidths(rows: readonly (readonly string[])[]): number[] {
  const width = rows.reduce((n, r) => Math.max(n, r.length), 0);
  const out: number[] = [];
  for (let c = 0; c < width; c += 1) {
    let longest = 0;
    for (const r of rows) longest = Math.max(longest, (r[c] ?? "").length);
    out.push(Math.min(MAX_COL, Math.max(MIN_COL, longest * CHAR_PX + 16)));
  }
  return out;
}

export interface PrintPage {
  /** Grid row indexes drawn on this page, in order (repeated frozen rows first). */
  rows: number[];
  /** Grid column indexes drawn on this page, in order (repeated frozen columns first). */
  cols: number[];
}

export interface PrintPlan {
  scale: number;
  geometry: PrintGeometry;
  colWidths: number[];
  pages: PrintPage[];
}

/** Splits `count` items into bands that fit `capacity(px)`, repeating `frozen` leading items on every band after the first. */
function bands(sizes: readonly number[], capacityPx: number, frozen: number, repeat: boolean): number[][] {
  const total = sizes.length;
  if (total === 0) return [];
  const result: number[][] = [];
  const lead = repeat ? Math.min(frozen, total) : 0;
  const leadPx = sizes.slice(0, lead).reduce((a, b) => a + b, 0);
  let at = 0;
  while (at < total) {
    const first = result.length === 0;
    const carry = !first && lead > 0 ? Array.from({ length: lead }, (_, i) => i) : [];
    let used = first ? 0 : leadPx;
    const band = [...carry];
    // A repeated header never leaves a page with no room for a body item.
    if (!first && leadPx >= capacityPx) used = 0;
    let added = 0;
    while (at < total) {
      const size = sizes[at]!;
      if (used + size > capacityPx && added > 0) break;
      band.push(at);
      used += size;
      added += 1;
      at += 1;
    }
    result.push(band);
  }
  return result;
}

/** The pages one grid prints on under `setup`: scale, repeated frozen panes, and page order. */
export function planSheetPrint(
  rows: readonly (readonly string[])[],
  setup: SheetPageSetup,
  frozen: { rows: number; cols: number } = { rows: 0, cols: 0 },
): PrintPlan {
  const geometry = printGeometry(setup);
  const colWidths = printColumnWidths(rows);
  const totalW = colWidths.reduce((a, b) => a + b, 0) || 1;
  const totalH = rows.length * PRINT_ROW_HEIGHT || 1;
  const fitW = geometry.areaWidth / totalW;
  const fitH = geometry.areaHeight / totalH;
  const scale =
    setup.scale === "width" ? Math.min(1, fitW) : setup.scale === "height" ? Math.min(1, fitH) : setup.scale === "page" ? Math.min(1, fitW, fitH) : 1;
  const rowBands = bands(
    rows.map(() => PRINT_ROW_HEIGHT),
    geometry.areaHeight / scale,
    frozen.rows,
    setup.repeatFrozenRows,
  );
  const colBands = bands(colWidths, geometry.areaWidth / scale, frozen.cols, setup.repeatFrozenColumns);
  const pages: PrintPage[] = [];
  if (setup.pageOrder === "down-over") {
    for (const cols of colBands) for (const r of rowBands) pages.push({ rows: r, cols });
  } else {
    for (const r of rowBands) for (const cols of colBands) pages.push({ rows: r, cols });
  }
  return { scale, geometry, colWidths, pages };
}
