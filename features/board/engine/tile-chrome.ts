/**
 * Board — tile chrome rules (pure). What a tile and its frame SHOW around the content, decided once
 * from the scene so every host and test reads the same answer:
 *
 *   · NEVER A NAME TWICE. When a tile carries its frame's name, the frame's label hides (the tile
 *     names it). In page layout a tile whose body draws its own titled card (`namesItself`) also drops
 *     its header bar and its tile frame: the body's own title is the one visible name, and the tile's
 *     "…" menu floats at the card's top right.
 *   · AUTO HEIGHT. In page layout a tile whose body lays out at its natural height (`autoHeight`) takes
 *     its content's height; the page scrolls, nothing inside does.
 *   · ONE ICON PER CHAPTER. A chapter (frame) shows its own icon: the one a template or agent set, else
 *     one read from what it holds, else a neutral one — never the same icon down the whole outline.
 */

import type { Rect } from "./camera";
import { frameAtTop } from "./arrange";
import type { BoardLayoutMode } from "./page-layout";

/** Two names are the same name: trimmed, case and inner spacing ignored. */
export function sameName(a: string | null | undefined, b: string | null | undefined): boolean {
  const n = (s: string | null | undefined) => (s ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  const x = n(a);
  return x.length > 0 && x === n(b);
}

interface ChromeFrame {
  id: string;
  rect: Rect;
  title: string;
}
interface ChromeTile {
  id: string;
  rect: Rect;
  title: string;
  /** The chapter (frame id) the tile is filed in, when it is (page layout keeps it; `pageMembership`). */
  chapter?: string;
}

/** The frame a tile belongs to: the one it is filed in while that frame exists, else the one holding its top edge. */
export function homeFrame(tile: { rect: Rect; chapter?: string }, frames: readonly { id: string; rect: Rect }[]): string | null {
  if (tile.chapter && frames.some((f) => f.id === tile.chapter)) return tile.chapter;
  return frameAtTop(tile.rect, frames);
}

/** Frame id → its tiles' ids (`homeFrame`: its filing, else the frame holding its top edge). */
export function frameMembers(frames: readonly ChromeFrame[], tiles: readonly ChromeTile[]): Map<string, string[]> {
  const out = new Map<string, string[]>(frames.map((f) => [f.id, []]));
  for (const t of tiles) {
    const f = homeFrame(t, frames);
    if (f) out.get(f)?.push(t.id);
  }
  return out;
}

/** Frames whose label hides because a tile inside already shows the same name. */
export function framesNamedByTile(frames: readonly ChromeFrame[], tiles: readonly ChromeTile[]): Set<string> {
  const byId = new Map(tiles.map((t) => [t.id, t]));
  const out = new Set<string>();
  for (const [fid, ids] of frameMembers(frames, tiles)) {
    const f = frames.find((x) => x.id === fid);
    if (f && ids.some((id) => sameName(byId.get(id)?.title, f.title))) out.add(fid);
  }
  return out;
}

export interface TileChrome {
  /** No header bar: the body names itself; the "…" menu floats over the body's top right. */
  headerless: boolean;
  /** No tile border or background: the body is the card (never a card inside a card). */
  bare: boolean;
  /** The tile takes its content's height (page layout): the body lays out at its natural height. */
  autoHeight: boolean;
  /** The tile grows until nothing inside it scrolls (page layout): the body keeps filling the tile. */
  growToFit: boolean;
}

export const FULL_CHROME: TileChrome = { headerless: false, bare: false, autoHeight: false, growToFit: false };

/** A tile's chrome in a layout, from what its type says about this source. */
export function tileChrome(
  layout: BoardLayoutMode,
  type: { namesItself?: boolean; autoHeight?: boolean | "fill" },
): TileChrome {
  if (layout !== "page") return FULL_CHROME;
  const own = type.namesItself === true;
  return { headerless: own, bare: own, autoHeight: type.autoHeight === true, growToFit: type.autoHeight === "fill" };
}

/**
 * The height an auto-height tile should take, or null to leave it: only a real change (≥ 1 px) of a
 * real measurement (a hidden or skipped body measures 0) moves it, so a re-measure never loops.
 */
/**
 * The moves an auto-height write makes: the tile takes its new height, and the frame holding it grows
 * with it (never shrinks here — page layout re-sizes frames after), so the tile's center stays inside
 * its own chapter. Growing a tile alone pushed its center into the next chapter and the page re-flow
 * then filed it there.
 */
export function autoHeightMoves(
  rect: Rect,
  id: string,
  h: number,
  frames: readonly { id: string; rect: Rect }[],
  /** The chapter the tile is filed in (its `chapter`): that frame grows, whatever else overlaps it. */
  chapter?: string,
): { id: string; x: number; y: number; w?: number; h?: number }[] {
  const moves: { id: string; x: number; y: number; w?: number; h?: number }[] = [{ id, x: rect.x, y: rect.y, w: rect.w, h }];
  const home = homeFrame({ rect, chapter }, frames);
  const f = home ? frames.find((x) => x.id === home) : undefined;
  if (f) {
    const bottom = rect.y + h + 8;
    if (bottom > f.rect.y + f.rect.h) moves.push({ id: f.id, x: f.rect.x, y: f.rect.y, w: f.rect.w, h: bottom - f.rect.y });
  }
  return moves;
}

export function autoHeightChange(current: number, measured: number, min = 48): number | null {
  if (!Number.isFinite(measured) || measured <= 0) return null;
  const next = Math.max(min, Math.ceil(measured));
  return Math.abs(next - current) >= 1 ? next : null;
}

/** What `innerSlack` reads of a scroller inside a tile. */
export interface ScrollerBox {
  scrollHeight: number;
  clientHeight: number;
  /** Its computed `overflow-y`. */
  overflowY: string;
  /** It has a max height of its own (a code block): growing the tile would never reveal it. */
  capped: boolean;
  /**
   * Where its content really ends (px from its scroll top): its deepest elements' lowest bottom, plus a
   * little room — never a wrapper stretched to fill it, nor an editor's "scroll past the end" padding.
   * Null when it has no child elements (a textarea): then only `scrollHeight` tells.
   */
  contentBottom: number | null;
}

/** A scroller shorter than this is a toolbar row scrolling sideways, never the body. */
export const FIT_MIN_SCROLLER_H = 48;

/**
 * How much taller (positive) or shorter (negative) a grow-to-fit tile should be so its content shows
 * whole and nothing inside scrolls: read from the scrollers sized by the layout (they grow with the
 * tile). A box with its own max height (a code block) never counts: growing the tile would not reveal
 * it, and counting it would grow the tile forever. Nor does a toolbar row. 0 = leave it.
 */
export function innerSlack(scrollers: readonly ScrollerBox[]): number {
  let most: number | null = null;
  for (const s of scrollers) {
    if (s.overflowY !== "auto" && s.overflowY !== "scroll") continue;
    if (s.capped || s.clientHeight < FIT_MIN_SCROLLER_H) continue;
    const slack = s.contentBottom !== null ? s.contentBottom - s.clientHeight : Math.max(0, s.scrollHeight - s.clientHeight);
    if (most === null || slack > most) most = slack;
  }
  if (most === null || Math.abs(most) <= 1) return 0;
  return most > 0 ? Math.ceil(most) : Math.floor(most);
}

/**
 * One grow-to-fit step. `slack` is `innerSlack` now; `floor` the overflow growing does not reveal;
 * `last` the previous growth. A growth that did not reduce the overflow (by at least half of what it
 * added) raises the floor to it and stops: never a runaway. Otherwise the tile grows by what is hidden
 * above the floor (content added since — typing — still grows it), or shrinks by what is spare.
 */
export function growStep(
  slack: number,
  floor: number,
  last: { hidden: number; by: number } | null,
): { grow: number; floor: number; hidden: number } {
  if (slack < -1) return { grow: slack, floor: 0, hidden: slack };
  if (last && slack > last.hidden - last.by / 2) return { grow: 0, floor: slack, hidden: slack };
  const above = slack - floor;
  return { grow: above > 1 ? above : 0, floor: Math.min(floor, Math.max(0, slack)), hidden: slack };
}

/**
 * The chapter icon's NAME (a Lucide icon name). The frame's own `icon` first (a template or agent set
 * it); else the first tile's hint (a section reads its table's look: "color_pair" → Palette); else the
 * tile's type; else a neutral icon. Names, not components, so the rule stays pure.
 */
export const LOOK_ICON: Readonly<Record<string, string>> = {
  color: "Palette",
  color_pair: "Palette",
  type_style: "Type",
  measure: "Ruler",
  measure_spacing: "MoveHorizontal",
  measure_radius: "SquareDashed",
  shadow: "Layers",
  opacity: "Blend",
  motion: "Activity",
  html_sample: "Component",
  attachment: "Folder",
};

export const CHAPTER_FALLBACK_ICON = "Bookmark";

export function chapterIconName(
  frame: { icon?: string | null },
  tileHints: readonly (string | null | undefined)[],
): string {
  if (frame.icon && frame.icon.trim()) return frame.icon.trim();
  for (const h of tileHints) if (h) return h;
  return CHAPTER_FALLBACK_ICON;
}

/** What a tile's content says about its chapter's icon (a `LOOK_ICON` value), or null to use its type's icon. */
export function tileIconHint(source: { kind: string; entity?: string; meta?: Record<string, unknown> | null }): string | null {
  const look = source.meta?.look;
  if (typeof look === "string" && LOOK_ICON[look]) return LOOK_ICON[look];
  if (source.kind === "text" || (source.kind === "entity" && source.entity === "note")) return "BookOpen";
  if (source.kind === "html") return "Component";
  if (source.kind === "entity" && source.entity === "file") return "Folder";
  return null;
}
