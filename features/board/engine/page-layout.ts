/**
 * Board — page layout (pure). A board in page layout reads like a document:
 * its frames are CHAPTERS stacked in one column, each full width, with the
 * tiles inside a frame stacked one under another at the chapter's full width
 * (a column of cards, vertical only) and loose tiles stacked the same way
 * between them. Nothing here touches the board: functions take rects
 * and return positions. Order is the arrange engine's (`readingOrder`), so a page
 * is the board's own reading order; membership is the tile's FILING
 * (`pageMembership`, kept on the tile as `chapter`), geometry only for a tile not
 * filed yet or one the person moved.
 *
 * The canvas is never lost: switching to page layout first takes a snapshot of
 * every canvas position (`canvasSnapshot`, kept in the board's settings), and
 * switching back puts every snapshotted thing back (`restoreCanvas`); things
 * added while in page layout ride with their frame, or land below.
 */

import type { Rect } from "./camera";
import { type Placed, frameAtTop, frameOf, readingOrder } from "./arrange";
import { sameName } from "./tile-chrome";

export type BoardLayoutMode = "canvas" | "page";

/** The readable column width, world px (shown at 100% when the view is wide enough). */
export const PAGE_COLUMN_W = 1100;
/**
 * The narrowest VIEW page layout re-flows to (the smallest real phone is 320 wide). A narrower one is a
 * pane mid-resize, hidden or squeezed: re-flowing the shared board to it left every tile 224 wide (the
 * 240 column floor) for everyone else, so it keeps the column instead.
 */
export const PAGE_MIN_VIEW_W = 320;

/**
 * The page column for a view (`columnW` for `planPageLayout`): the usable width when the view is a phone,
 * undefined (the default column) when it is wide, not measured yet (0), or narrower than any phone.
 */
export function pageColumnWidth(viewW: number, usableW: number): number | undefined {
  if (viewW < PAGE_MIN_VIEW_W) return undefined;
  const w = Math.floor(usableW);
  return w < PAGE_COLUMN_W ? w : undefined;
}
/** Space between sections (chapters sit close: a column of cards, not islands). */
export const PAGE_SECTION_GAP = 16;
/** Space between tiles stacked in a chapter. */
export const PAGE_TILE_GAP = 16;
/** A frame's inner padding (sides and bottom). */
export const PAGE_FRAME_PAD = 8;
/** A frame's top padding when it shows no label (a tile inside already names it). */
export const PAGE_FRAME_TOP = PAGE_FRAME_PAD;
/** Room for a chapter's small label, drawn INSIDE the frame's top in page layout. */
export const PAGE_LABEL_H = 24;
/** An empty chapter still reads as one. */
export const PAGE_MIN_FRAME_H = 120;

/**
 * What page layout reads of a thing: its place, (optionally) its name, the chapter it is FILED in
 * (`chapter`, a frame id kept on the tile: a template files each tile in its chapter, and page layout
 * keeps it there until the person moves the tile), and whether it keeps its own size (`fixedSize`: a
 * drawn mark or canvas text, which page layout stacks but never stretches).
 */
export type PagePlaced = Placed & { title?: string; chapter?: string; fixedSize?: boolean };

export interface PageMove {
  id: string;
  x: number;
  y: number;
  /** The new size: frames always; a tile when page layout sets its width (every tile but a fixed-size one). */
  w?: number;
  h?: number;
}

export interface PagePlan {
  moves: PageMove[];
  /** The column the page occupies (world px); the camera centers it. */
  column: { x: number; w: number };
  /** Frame ids in page order (the chapters). */
  chapters: string[];
  /**
   * Tile id → the chapter it is filed in. Hand it back as `opts.members`, and keep it on the tile
   * (`chapter`), so a tile stays in its chapter however its size or the frames' sizes change.
   */
  members: Map<string, string>;
  /** Where this plan put every tile (top-left): hand it back as `opts.placed` to tell a person's move. */
  placed: Map<string, { x: number; y: number }>;
}

/** One per row, top to bottom: the page is one column of cards. */
function stack(items: readonly Placed[], x0: number, y0: number): { placed: Placed[]; height: number } {
  const placed: Placed[] = [];
  let y = y0;
  for (const it of readingOrder(items)) {
    placed.push({ id: it.id, rect: { ...it.rect, x: Math.round(x0), y: Math.round(y) } });
    y += it.rect.h + PAGE_TILE_GAP;
  }
  return { placed, height: items.length ? y - PAGE_TILE_GAP - y0 : 0 };
}

/**
 * Which chapter each tile is filed in. A tile keeps the chapter it was filed in (this session's
 * `members`, else its own stored `chapter`) while that frame exists — a section growing to its
 * content, or a frame growing over the next one, never refiles it. Place (`frameAtTop`) decides only
 * for a tile with no filing yet, or one the person MOVED (its top-left is no longer where the last plan
 * put it — growing never moves the top-left), or when `byPlace` says the person arranged everything
 * (the switch in from the canvas).
 *
 * Repair (boards saved before filing existed): an unfiled tile whose place is another chapter, while the
 * chapter carrying its own name holds nothing, goes back to that chapter — the template named the
 * chapter after its tile, and the empty chapter is where the tile slid out of.
 */
export function pageMembership(
  scene: { tiles: readonly PagePlaced[]; frames: readonly PagePlaced[] },
  opts: { members?: ReadonlyMap<string, string>; placed?: ReadonlyMap<string, { x: number; y: number }>; byPlace?: boolean } = {},
): { units: Placed[]; members: Map<string, string[]> } {
  const members = new Map<string, string[]>(scene.frames.map((f) => [f.id, []]));
  const filed = new Map<string, string>();
  const file = (id: string, f: string) => {
    members.get(f)!.push(id);
    filed.set(id, f);
  };
  const frameIdSet = new Set(scene.frames.map((f) => f.id));
  const byPlace: PagePlaced[] = [];
  for (const t of scene.tiles) {
    const last = opts.placed?.get(t.id);
    const moved = !!last && (last.x !== t.rect.x || last.y !== t.rect.y);
    const kept = opts.byPlace || moved ? undefined : (opts.members?.get(t.id) ?? t.chapter);
    if (kept && frameIdSet.has(kept)) file(t.id, kept);
    else byPlace.push(t);
  }
  const placeOf = new Map<string, string | null>(byPlace.map((t) => [t.id, frameAtTop(t.rect, scene.frames)]));
  const heldByPlace = new Set([...placeOf.values()].filter((f): f is string => !!f));
  for (const t of byPlace) {
    const here = placeOf.get(t.id) ?? null;
    if (!opts.byPlace && !t.chapter && t.title) {
      const own = scene.frames.find((f) => sameName(f.title, t.title));
      if (own && own.id !== here && !heldByPlace.has(own.id) && (members.get(own.id) ?? []).length === 0) {
        file(t.id, own.id);
        continue;
      }
    }
    if (here) file(t.id, here);
  }
  return { units: [...scene.frames, ...scene.tiles.filter((t) => !filed.has(t.id))], members };
}

/**
 * The page arrangement of a board: units (frames with their tiles, loose tiles) in reading order,
 * each frame a full-width section whose tiles stack one under another at the chapter's full inner
 * width, loose tiles stacked the same way between chapters. Only what moves is returned.
 */
export function planPageLayout(
  scene: { tiles: readonly PagePlaced[]; frames: readonly PagePlaced[] },
  /** A chapter order to apply (the outline's move up / down): frames take the frame slots in this order. */
  frameOrder?: readonly string[],
  /**
   * A view narrower than the column (a phone): the column takes the view's width at 100% zoom, and every
   * tile takes the chapter's width — text stays readable, nothing shrinks to fit.
   */
  opts: {
    columnW?: number;
    /** The chapter each tile was filed in last time (the previous plan's `members`); see `pageMembership`. */
    members?: ReadonlyMap<string, string>;
    /** Where the previous plan put each tile (its `placed`): a tile no longer there was moved by the person. */
    placed?: ReadonlyMap<string, { x: number; y: number }>;
    /** File every tile by where it sits (the person arranged the canvas; switching into page layout). */
    byPlace?: boolean;
  } = {},
): PagePlan {
  const narrow = opts.columnW !== undefined && opts.columnW < PAGE_COLUMN_W ? Math.max(240, Math.floor(opts.columnW)) : null;
  const widest = Math.max(0, ...scene.tiles.map((t) => t.rect.w));
  const W = narrow ?? Math.max(PAGE_COLUMN_W, widest + PAGE_FRAME_PAD * 2);
  const x0 = 0;
  const innerW = W - PAGE_FRAME_PAD * 2;
  const { units, members } = pageMembership(scene, opts);
  const frameIds = new Set(scene.frames.map((f) => f.id));
  const tileById = new Map(scene.tiles.map((t) => [t.id, t]));
  const frameById = new Map(scene.frames.map((f) => [f.id, f]));
  /** Tiles whose width page layout sets (every tile but a fixed-size mark). */
  const sized = new Set<string>();
  /** Every tile takes the chapter's inner width (a column of cards); a drawn mark keeps its own size. */
  const fullWidth = (t: PagePlaced): PagePlaced => {
    if (t.fixedSize) return t;
    sized.add(t.id);
    return { ...t, rect: { ...t.rect, w: innerW } };
  };
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
  let loose: PagePlaced[] = [];
  const flushLoose = () => {
    if (!loose.length) return;
    const { placed, height } = stack(loose.map(fullWidth), x0 + PAGE_FRAME_PAD, y);
    for (const p of placed) out.set(p.id, p.rect);
    y += height + PAGE_SECTION_GAP;
    loose = [];
  };
  for (const u of ordered) {
    if (!frameIds.has(u.id)) {
      loose.push(tileById.get(u.id) ?? u);
      continue;
    }
    flushLoose();
    chapters.push(u.id);
    const inside = (members.get(u.id) ?? []).map((id) => tileById.get(id)).filter((t): t is PagePlaced => !!t);
    const frame = frameById.get(u.id);
    // The label shows (inside the frame's top) unless a tile inside already carries the same name.
    const labelled = !!frame?.title?.trim() && !inside.some((t) => sameName(t.title, frame.title));
    const top = labelled ? PAGE_FRAME_PAD + PAGE_LABEL_H : PAGE_FRAME_TOP;
    const { placed, height } = stack(inside.map(fullWidth), x0 + PAGE_FRAME_PAD, y + top);
    for (const p of placed) out.set(p.id, p.rect);
    const h = inside.length ? top + height + PAGE_FRAME_PAD : Math.max(PAGE_MIN_FRAME_H, top + PAGE_FRAME_PAD);
    out.set(u.id, { x: x0, y, w: W, h });
    y += h + PAGE_SECTION_GAP;
  }
  flushLoose();
  const before = new Map<string, Rect>([...scene.tiles, ...scene.frames].map((p) => [p.id, p.rect]));
  const moves: PageMove[] = [];
  const placedAt = new Map<string, { x: number; y: number }>();
  for (const [id, r] of out) {
    const was = before.get(id);
    if (!was) continue;
    const isFrame = frameIds.has(id);
    if (!isFrame) placedAt.set(id, { x: r.x, y: r.y });
    const sizes = isFrame || sized.has(id);
    const sizeChanged = sizes && (was.w !== r.w || was.h !== r.h);
    if (was.x === r.x && was.y === r.y && !sizeChanged) continue;
    moves.push(sizes ? { id, x: r.x, y: r.y, w: r.w, h: r.h } : { id, x: r.x, y: r.y });
  }
  const memberOf = new Map<string, string>();
  for (const [f, ids] of members) for (const id of ids) memberOf.set(id, f);
  return { moves, column: { x: x0, w: W }, chapters, members: memberOf, placed: placedAt };
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
    const f = frameAtTop(t.rect, scene.frames);
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
 * Where a NEW thing goes in page layout: into the chapter being read (its top just inside the frame's
 * bottom, so the stack puts it last), or below everything as a new loose section when no
 * chapter is in view. Null when it already sits inside a chapter.
 */
export function pageLanding(
  rect: Rect,
  frames: readonly Placed[],
  readingLineY: number,
  contentBottom: number,
): { x: number; y: number } | null {
  if (frameAtTop(rect, frames)) return null;
  const reading = frames.find((f) => readingLineY >= f.rect.y - PAGE_SECTION_GAP && readingLineY <= f.rect.y + f.rect.h);
  if (reading) {
    // Its top just inside the chapter's bottom (filing reads the top edge, `frameAtTop`): last in the stack.
    const f = reading.rect;
    return { x: Math.round(f.x + f.w / 2 - rect.w / 2), y: Math.round(f.y + f.h - 2) };
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
