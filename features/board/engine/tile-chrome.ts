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
import { frameOf } from "./arrange";
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
}

/** Frame id → its tiles' ids (a tile belongs to the frame holding its centre). */
export function frameMembers(frames: readonly ChromeFrame[], tiles: readonly ChromeTile[]): Map<string, string[]> {
  const out = new Map<string, string[]>(frames.map((f) => [f.id, []]));
  for (const t of tiles) {
    const f = frameOf(t.rect, frames);
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
  /** The tile takes its content's height (page layout). */
  autoHeight: boolean;
}

export const FULL_CHROME: TileChrome = { headerless: false, bare: false, autoHeight: false };

/** A tile's chrome in a layout, from what its type says about this source. */
export function tileChrome(
  layout: BoardLayoutMode,
  type: { namesItself?: boolean; autoHeight?: boolean },
): TileChrome {
  if (layout !== "page") return FULL_CHROME;
  const own = type.namesItself === true;
  return { headerless: own, bare: own, autoHeight: type.autoHeight === true };
}

/**
 * The height an auto-height tile should take, or null to leave it: only a real change (≥ 1 px) of a
 * real measurement (a hidden or skipped body measures 0) moves it, so a re-measure never loops.
 */
export function autoHeightChange(current: number, measured: number, min = 48): number | null {
  if (!Number.isFinite(measured) || measured <= 0) return null;
  const next = Math.max(min, Math.ceil(measured));
  return Math.abs(next - current) >= 1 ? next : null;
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
