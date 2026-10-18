/**
 * Board — page layout (pure). A board in page layout reads like a document:
 * its frames are CHAPTERS stacked in one column, each full width, with the
 * tiles inside a frame flowing in rows (like text) and loose tiles flowing in
 * blocks between them. Nothing here touches the board: functions take rects
 * and return positions. Frame membership and order are the arrange engine's
 * (`boardUnits`, `readingOrder`), so a page is the board's own reading order.
 *
 * The canvas is never lost: switching to page layout first takes a snapshot of
 * every canvas position (`canvasSnapshot`, kept in the board's settings), and
 * switching back puts every snapshotted thing back (`restoreCanvas`); things
 * added while in page layout ride with their frame, or land below.
 */

import type { Rect } from "./camera";
import { type Placed, boardUnits, frameOf, readingOrder } from "./arrange";
import { sameName } from "./tile-chrome";

export type BoardLayoutMode = "canvas" | "page";

/** The readable column width, world px (shown at 100% when the view is wide enough). */
export const PAGE_COLUMN_W = 1100;
/** Space between sections (chapters sit close: a column of cards, not islands). */
export const PAGE_SECTION_GAP = 16;
/** Space between tiles in a flow. */
export const PAGE_TILE_GAP = 16;
/** A frame's inner padding (sides and bottom). */
export const PAGE_FRAME_PAD = 8;
/** A frame's top padding when it shows no label (a tile inside already names it). */
export const PAGE_FRAME_TOP = PAGE_FRAME_PAD;
/** Room for a chapter's small label, drawn INSIDE the frame's top in page layout. */
export const PAGE_LABEL_H = 24;
/** An empty chapter still reads as one. */
export const PAGE_MIN_FRAME_H = 120;

/** What page layout reads of a thing: its place, and (optionally) its name. */
type PagePlaced = Placed & { title?: string };

export interface PageMove {
  id: string;
  x: number;
  y: number;
  /** The new size: frames always; a tile only when it is a chapter's one tile (it takes the chapter's width). */
  w?: number;
  h?: number;
}

export interface PagePlan {
  moves: PageMove[];
  /** The column the page occupies (world px); the camera centres it. */
  column: { x: number; w: number };
  /** Frame ids in page order (the chapters). */
  chapters: string[];
}

/** Rows within `width`, left to right then down (a tile wider than the row takes a row alone). */
function flow(items: readonly Placed[], x0: number, y0: number, width: number): { placed: Placed[]; height: number } {
  const placed: Placed[] = [];
  let x = x0;
  let y = y0;
  let rowH = 0;
  for (const it of readingOrder(items)) {
    if (x > x0 && x + it.rect.w > x0 + width) {
      x = x0;
      y += rowH + PAGE_TILE_GAP;
      rowH = 0;
    }
    placed.push({ id: it.id, rect: { ...it.rect, x: Math.round(x), y: Math.round(y) } });
    x += it.rect.w + PAGE_TILE_GAP;
    rowH = Math.max(rowH, it.rect.h);
  }
  return { placed, height: items.length ? y + rowH - y0 : 0 };
}

/**
 * The page arrangement of a board: units (frames with their tiles, loose tiles) in reading order,
 * each frame a full-width section, runs of loose tiles a flowed block. Only what moves is returned.
 */
export function planPageLayout(
  scene: { tiles: readonly PagePlaced[]; frames: readonly PagePlaced[] },
  /** A chapter order to apply (the outline's move up / down): frames take the frame slots in this order. */
  frameOrder?: readonly string[],
): PagePlan {
  const widest = Math.max(0, ...scene.tiles.map((t) => t.rect.w));
  const W = Math.max(PAGE_COLUMN_W, widest + PAGE_FRAME_PAD * 2);
  const x0 = 0;
  const { units, members } = boardUnits(scene);
  const frameIds = new Set(scene.frames.map((f) => f.id));
  const tileById = new Map(scene.tiles.map((t) => [t.id, t]));
  const frameById = new Map(scene.frames.map((f) => [f.id, f]));
  /** Tiles whose size page layout sets (a chapter's one tile). */
  const sized = new Set<string>();
  let ordered = readingOrder(units);
  if (frameOrder) {
    // The listed frames take the listed frames' slots in the given order; a frame not listed (made
    // since) keeps its own reading-order slot.
    const rank = new Map(frameOrder.map((id, i) => [id, i]));
    const listed = ordered.filter((u) => rank.has(u.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
    let k = 0;
    ordered = ordered.map((u) => (rank.has(u.id) ? listed[k++] : u));
  }
  const out = new Map<string, Rect>();
  const chapters: string[] = [];
  let y = 0;
  let loose: Placed[] = [];
  const flushLoose = () => {
    if (!loose.length) return;
    const { placed, height } = flow(loose, x0, y, W);
    for (const p of placed) out.set(p.id, p.rect);
    y += height + PAGE_SECTION_GAP;
    loose = [];
  };
  for (const u of ordered) {
    if (!frameIds.has(u.id)) {
      loose.push(u);
      continue;
    }
    flushLoose();
    chapters.push(u.id);
    const inside = (members.get(u.id) ?? []).map((id) => tileById.get(id)).filter((t): t is PagePlaced => !!t);
    const frame = frameById.get(u.id);
    // The label shows (inside the frame's top) unless a tile inside already carries the same name.
    const labelled = !!frame?.title?.trim() && !inside.some((t) => sameName(t.title, frame.title));
    const top = labelled ? PAGE_FRAME_PAD + PAGE_LABEL_H : PAGE_FRAME_TOP;
    const innerW = W - PAGE_FRAME_PAD * 2;
    // A chapter's one tile takes the chapter's full width (a section reads as the page's own card).
    const sole = inside.length === 1 ? [{ ...inside[0], rect: { ...inside[0].rect, w: innerW } }] : inside;
    if (sole !== inside) sized.add(inside[0].id);
    const { placed, height } = flow(sole, x0 + PAGE_FRAME_PAD, y + top, innerW);
    for (const p of placed) out.set(p.id, p.rect);
    const h = inside.length ? top + height + PAGE_FRAME_PAD : Math.max(PAGE_MIN_FRAME_H, top + PAGE_FRAME_PAD);
    out.set(u.id, { x: x0, y, w: W, h });
    y += h + PAGE_SECTION_GAP;
  }
  flushLoose();
  const before = new Map<string, Rect>([...scene.tiles, ...scene.frames].map((p) => [p.id, p.rect]));
  const moves: PageMove[] = [];
  for (const [id, r] of out) {
    const was = before.get(id);
    if (!was) continue;
    const isFrame = frameIds.has(id);
    const sizes = isFrame || sized.has(id);
    const sizeChanged = sizes && (was.w !== r.w || was.h !== r.h);
    if (was.x === r.x && was.y === r.y && !sizeChanged) continue;
    moves.push(sizes ? { id, x: r.x, y: r.y, w: r.w, h: r.h } : { id, x: r.x, y: r.y });
  }
  return { moves, column: { x: x0, w: W }, chapters };
}

/** Frames in reading order — a board's chapters in either layout. */
export function chapterOrder<F extends Placed>(frames: readonly F[]): F[] {
  return readingOrder(frames) as F[];
}

/** Where every thing sits on the canvas, by id: what page layout keeps so Canvas layout comes back. */
export type CanvasSnapshot = Record<string, [number, number, number, number]>;

export function canvasSnapshot(scene: { tiles: readonly Placed[]; frames: readonly Placed[] }): CanvasSnapshot {
  const out: CanvasSnapshot = {};
  for (const p of [...scene.tiles, ...scene.frames]) out[p.id] = [p.rect.x, p.rect.y, p.rect.w, p.rect.h];
  return out;
}

/** A stored snapshot, or null when the value is not one (never trusted blindly: it rides in jsonb). */
export function parseCanvasSnapshot(value: unknown): CanvasSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const out: CanvasSnapshot = {};
  for (const [id, r] of Object.entries(value as Record<string, unknown>)) {
    if (Array.isArray(r) && r.length === 4 && r.every((n) => typeof n === "number" && Number.isFinite(n))) {
      out[id] = [r[0], r[1], r[2], r[3]];
    }
  }
  return out;
}

/**
 * Back to the canvas: every snapshotted thing returns to its canvas place (a frame to its canvas
 * size too). A thing added in page layout rides with the frame it sits in (same offset as that
 * frame); a loose one lands in a row below the restored canvas.
 */
export function restoreCanvas(
  scene: { tiles: readonly Placed[]; frames: readonly Placed[] },
  snapshot: CanvasSnapshot,
): PageMove[] {
  const moves: PageMove[] = [];
  const frameIds = new Set(scene.frames.map((f) => f.id));
  const restored: Rect[] = [];
  for (const p of [...scene.frames, ...scene.tiles]) {
    const s = snapshot[p.id];
    if (!s) continue;
    const [x, y, w, h] = s;
    // A tile gets its canvas size back too (page layout widens a chapter's one tile and grows a tile to its content).
    restored.push({ x, y, w, h });
    const same = p.rect.x === x && p.rect.y === y && p.rect.w === w && p.rect.h === h;
    if (!same) moves.push({ id: p.id, x, y, w, h });
  }
  const newcomers = scene.tiles.filter((t) => !snapshot[t.id]);
  if (!newcomers.length) return moves;
  const bottom = restored.length ? Math.max(...restored.map((r) => r.y + r.h)) : 0;
  const left = restored.length ? Math.min(...restored.map((r) => r.x)) : 0;
  let x = left;
  for (const t of readingOrder(newcomers)) {
    const f = frameOf(t.rect, scene.frames);
    const fs = f ? snapshot[f] : undefined;
    const fr = f ? scene.frames.find((q) => q.id === f)?.rect : undefined;
    if (fs && fr) {
      moves.push({ id: t.id, x: t.rect.x + (fs[0] - fr.x), y: t.rect.y + (fs[1] - fr.y) });
      continue;
    }
    moves.push({ id: t.id, x, y: bottom + PAGE_SECTION_GAP });
    x += t.rect.w + PAGE_TILE_GAP;
  }
  return moves;
}

/** The chapter a viewer is reading: the last chapter whose top is above the reading line (world y). */
export function activeChapter(chapters: readonly { id: string; rect: Rect }[], readingLineY: number): string | null {
  let best: string | null = null;
  for (const c of chapters) {
    if (c.rect.y <= readingLineY) best = c.id;
  }
  return best ?? chapters[0]?.id ?? null;
}

/** The setting value, read defensively (absent or anything else = canvas). */
export function layoutModeOf(value: unknown): BoardLayoutMode {
  return value === "page" ? "page" : "canvas";
}

/**
 * Where a NEW thing goes in page layout: into the chapter being read (its centre inside the frame's
 * bottom-right corner, so the flow puts it last), or below everything as a new loose section when no
 * chapter is in view. Null when it already sits inside a chapter.
 */
export function pageLanding(
  rect: Rect,
  frames: readonly Placed[],
  readingLineY: number,
  contentBottom: number,
): { x: number; y: number } | null {
  if (frameOf(rect, frames)) return null;
  const reading = frames.find((f) => readingLineY >= f.rect.y - PAGE_SECTION_GAP && readingLineY <= f.rect.y + f.rect.h);
  if (reading) {
    const f = reading.rect;
    return { x: Math.round(f.x + f.w - 1 - rect.w / 2), y: Math.round(f.y + f.h - 1 - rect.h / 2) };
  }
  return { x: 0, y: Math.round(contentBottom + PAGE_SECTION_GAP) };
}

/** A stored chapter order (frame ids), read defensively. */
export function parseChapterOrder(value: unknown): string[] | null {
  return Array.isArray(value) && value.every((v) => typeof v === "string") ? (value as string[]) : null;
}

/**
 * A switch back to the canvas that did not finish: the layout setting says canvas, a kept canvas
 * exists, yet the board still sits exactly in its page arrangement (the tab closed after the
 * setting landed, before the restored positions saved). True = put the canvas back now.
 */
export function interruptedLeave(
  scene: { tiles: readonly Placed[]; frames: readonly Placed[] },
  snapshot: CanvasSnapshot | null,
  chapterOrderValue: readonly string[] | null,
): boolean {
  if (!snapshot || scene.tiles.length + scene.frames.length === 0) return false;
  if (planPageLayout(scene, chapterOrderValue ?? undefined).moves.length !== 0) return false;
  return restoreCanvas(scene, snapshot).length > 0;
}
