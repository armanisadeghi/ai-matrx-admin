/**
 * A BOARD'S DESIGN TOKENS. A board that holds design-token tables (a colour, measure, shadow, opacity,
 * motion or type-style section) is its own design system: component samples (`html_sample` frames)
 * anywhere on the board draw with THOSE tokens, not the app's. The host (`home/UserBoard.tsx`) lists
 * the token tables in chapter (reading) order; each Table tile body hands them to records-ui's
 * `TableTokensProvider`, which turns every row into a `--<row name>` variable for the frames below it.
 */

import { createContext, useContext } from "react";
import type { Rect } from "../engine/camera";
import { readingOrder } from "../engine/arrange";
import { TABLE_ENTITY } from "./table-tile";

/** The table looks (`meta.look`, `tableLookHint`) that make a table a set of design tokens. */
export const TOKEN_LOOKS: ReadonlySet<string> = new Set([
  "color_pair",
  "color",
  "measure",
  "measure_spacing",
  "measure_radius",
  "shadow",
  "opacity",
  "motion",
  "type_style",
]);

interface TileLike {
  id: string;
  rect: Rect;
  source: { kind: string; entity?: string; id?: string | null; meta?: Record<string, unknown> | null };
}

/** The board's token tables, by table id, in reading order (a later table wins a shared name), each once. */
export function boardTokenTableIds(tiles: readonly TileLike[]): string[] {
  const out: string[] = [];
  const byId = new Map(tiles.map((t) => [t.id, t]));
  for (const p of readingOrder(tiles)) {
    const s = byId.get(p.id)?.source;
    if (!s) continue;
    const look = s.meta?.look;
    if (s.kind !== "entity" || s.entity !== TABLE_ENTITY || !s.id || typeof look !== "string" || !TOKEN_LOOKS.has(look)) continue;
    if (!out.includes(s.id)) out.push(s.id);
  }
  return out;
}

const NONE: readonly string[] = [];
export const BoardTokenTablesContext = createContext<readonly string[]>(NONE);

/** The token tables of the board this tile is on (none off a board). */
export function useBoardTokenTables(): readonly string[] {
  return useContext(BoardTokenTablesContext);
}
