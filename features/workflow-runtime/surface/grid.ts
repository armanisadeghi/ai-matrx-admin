/**
 * THE RUN PAGE ON THE ONE GRID ENGINE (custom-experience PLAN §5.6, lane W).
 *
 * A run page is drawn by design-system `GridCanvas` in line mode (`fit="content"`): an ordered list of
 * readouts, each with a width, flowed left to right and wrapped, every line as tall as its content. That
 * is exactly what the run page always was (`w` picks a span, the array order is the reading order, `h` is a
 * minimum height) — so this module is only the CONVERSION between the stored document and the engine, and
 * every flow decision (packing, a step in reading order) is the engine's `packLines` / `stepLines`.
 *
 * The stored document is unchanged: Grafana-style `{x, y, w, h}` on a 24-column grid (ruling R7). Reading it
 * keeps `w` and `h` byte for byte; `x` / `y` are re-derived from the order, exactly as the builder always
 * re-derived them. A stored width maps to a 12-column line span (`lineSpan`), never narrower than a third.
 *
 * Pure: no React, no Redux.
 */

import { GRID_CANVAS_COLUMNS, packLines, stepLines, type GridBox, type GridCanvasItem } from "@ai-matrx/design-system";

import { GRID_COLUMNS, type Readout } from "./config";

/** Columns of the run page's line grid (the engine's desktop grid). */
export const LINE_COLUMNS = GRID_CANVAS_COLUMNS.lg;
/** The narrowest a readout draws: a third of the line, so a rich kind never wraps its own words. */
const MIN_LINE_SPAN = LINE_COLUMNS / 3;

/** A stored 24-column width as a 12-column line span, never narrower than a readable third. */
export function lineSpan(w: number): number {
  const span = Math.round((w / GRID_COLUMNS) * LINE_COLUMNS);
  return Math.min(LINE_COLUMNS, Math.max(MIN_LINE_SPAN, span));
}

/** One stored grid unit of the 24-column document per line-grid column. */
const DOC_UNITS_PER_COLUMN = GRID_COLUMNS / LINE_COLUMNS;

/** The readouts, in the given order, as line boxes the engine packs (reading order = array order). */
function lineBoxes(readouts: readonly Readout[], fullWidth = false): GridBox[] {
  return readouts.map((r, n) => ({ id: r.id, x: 0, y: n, w: fullWidth ? LINE_COLUMNS : lineSpan(r.pos.w), h: 1 }));
}

/**
 * The run page's GridCanvas items for one screen, in the order given. Desktop: the line grid (every
 * readout full width when the stage is too narrow for columns). Phone: ONE column, in `phoneOrder`.
 */
export function runCanvasItems(
  readouts: readonly Readout[],
  options: { fullWidth?: boolean; phoneOrder?: readonly string[] } = {},
): GridCanvasItem[] {
  const lg = lineBoxes(readouts, options.fullWidth);
  const phoneIndex = new Map((options.phoneOrder ?? readouts.map((r) => r.id)).map((id, n) => [id, n]));
  return readouts.map((r, n) => ({
    id: r.id,
    lg: { x: lg[n]!.x, y: lg[n]!.y, w: lg[n]!.w, h: 1 },
    sm: { x: 0, y: phoneIndex.get(r.id) ?? n, w: GRID_CANVAS_COLUMNS.sm, h: 1 },
  }));
}

/**
 * Re-derive one screen's stored positions from its ORDER through the engine: `packLines` places every
 * readout on a line; `x` is its line column in document units, `y` the line's top (the sum of the lines
 * above, each as tall as its tallest readout). `w` and `h` are kept exactly as stored, and every other key
 * on a readout is carried by spread.
 */
export function packScreenLines(panels: readonly Readout[]): Readout[] {
  const boxes = packLines(lineBoxes(panels), LINE_COLUMNS);
  const lineHeight = new Map<number, number>();
  panels.forEach((p, n) => {
    const line = boxes[n]!.y;
    lineHeight.set(line, Math.max(lineHeight.get(line) ?? 0, Math.max(1, Math.round(p.pos.h))));
  });
  const top = new Map<number, number>();
  let y = 0;
  for (const line of [...lineHeight.keys()].sort((a, b) => a - b)) {
    top.set(line, y);
    y += lineHeight.get(line)!;
  }
  return panels.map((p, n) => {
    const box = boxes[n]!;
    const w = Math.min(GRID_COLUMNS, Math.max(1, Math.round(p.pos.w)));
    const x = Math.min(GRID_COLUMNS - w, box.x * DOC_UNITS_PER_COLUMN);
    return { ...p, pos: { x, y: top.get(box.y)!, w, h: Math.max(1, Math.round(p.pos.h)) } };
  });
}

/** One screen's readouts with `panelId` moved one place earlier (-1) or later (+1) in reading order. */
export function stepScreenPanel(panels: readonly Readout[], panelId: string, by: -1 | 1): Readout[] {
  const stepped = stepLines(lineBoxes(panels), panelId, by, LINE_COLUMNS);
  const order = stepped
    .map((box, n) => ({ box, panel: panels[n]! }))
    .sort((a, b) => a.box.y - b.box.y || a.box.x - b.box.x)
    .map((e) => e.panel);
  return order;
}
