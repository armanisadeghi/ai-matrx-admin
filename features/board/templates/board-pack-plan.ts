/**
 * A PACK'S BOARD AS BOARD DOCUMENTS (pure). A Space template pack may carry a `board`
 * (lib/spaces-blocks/template-pack.ts `PackBoard`): chapters (frames) whose tiles name the pack's tables by
 * TOKEN. Once the tables are installed (`installTemplateTables`), this turns each board of the pack into a
 * BoardDocument with every table tile pointed at the made table id — the same tile sources the Add menu
 * makes (`data-table` with `meta.layout: "section"`, a `note` with a `seed`, a write-up's `text`).
 *
 * Page layout (`layout: "page"`): frames are stacked in one column exactly as `planPageLayout` places them
 * (full width, tiles flowing inside), so the board opens already arranged. A canvas board gets the same
 * column; the person moves things from there.
 */

import { packBoards, type PackBoard, type PackBoardPage, type PackBoardTile, type ResolvedTable } from "@/lib/spaces-blocks/template-pack";

import type { BoardDocument, BoardGroup, BoardNode, NodeSource } from "../board/document";
import { PAGE_COLUMN_W, PAGE_FRAME_PAD, PAGE_FRAME_TOP, PAGE_MIN_FRAME_H, PAGE_SECTION_GAP, PAGE_TILE_GAP, planPageLayout } from "../engine/page-layout";
import { TABLE_ENTITY, TABLE_LAYOUT_SECTION, entityTableSource } from "../items/table-tile";
// The cover's entity word (kept with its item, cover-items.tsx); a literal import would pull the tile body here.
const COVER_ENTITY = "cover";

/** One board to make: its key and title, its layout, and its document. */
export interface PlannedBoard {
  key: string;
  title: string;
  layout: "page" | "canvas";
  doc: BoardDocument;
}

function tileSource(tile: PackBoardTile, tables: Record<string, ResolvedTable>): NodeSource {
  switch (tile.kind) {
    case "table": {
      // A real schema table (a registered entity token): nothing was installed for it; the tile reads the platform's rows.
      if (tile.entity) return entityTableSource(tile.entity, { layout: tile.layout === "section" ? "section" : "table" });
      const made = tile.table ? tables[tile.table] : undefined;
      // A token with no made table is the checker's finding; at use time it is a bug, said by name.
      if (!made) throw new Error(`The template's "${tile.table ?? "?"}" table was not made, so the "${tile.title}" tile has nothing to show.`);
      return { kind: "entity", entity: TABLE_ENTITY, id: made.tableId, ...(tile.layout === "section" ? { meta: { layout: TABLE_LAYOUT_SECTION } } : {}) };
    }
    case "note":
      // The note is named from its first line (starter-notes.ts files it in the board's organization).
      return { kind: "entity", entity: "note", id: null, meta: { seed: tile.text?.startsWith(tile.title) ? tile.text : `${tile.title}\n\n${tile.text ?? ""}` } };
    case "writeUp":
      return { kind: "text", markdown: tile.text ?? "" };
    case "cover":
      return { kind: "entity", entity: COVER_ENTITY, id: null, meta: { hero: tile.hero ?? "", markdown: tile.text ?? "" } };
  }
}

/** One board of the pack as a document: chapters stacked in reading order, tiles in rows inside each. */
export function packBoardDocument(board: PackBoardPage, tables: Record<string, ResolvedTable>, newId: () => string = () => crypto.randomUUID()): BoardDocument {
  const nodes: BoardNode[] = [];
  const groups: BoardGroup[] = [];
  const inner = PAGE_COLUMN_W - PAGE_FRAME_PAD * 2;
  let y = 0;
  for (const chapter of board.chapters) {
    // Each tile is FILED in its chapter (`chapter`): it stays there whatever its height turns out to be.
    const groupId = newId();
    let x = PAGE_FRAME_PAD;
    let rowY = y + PAGE_FRAME_TOP;
    let rowH = 0;
    for (const tile of chapter.tiles) {
      if (x > PAGE_FRAME_PAD && x + tile.size.w > PAGE_FRAME_PAD + inner) {
        x = PAGE_FRAME_PAD;
        rowY += rowH + PAGE_TILE_GAP;
        rowH = 0;
      }
      nodes.push({ id: newId(), rect: { x, y: rowY, w: tile.size.w, h: tile.size.h }, title: tile.title, source: tileSource(tile, tables), chapter: groupId });
      x += tile.size.w + PAGE_TILE_GAP;
      rowH = Math.max(rowH, tile.size.h);
    }
    const height = chapter.tiles.length ? rowY + rowH - (y + PAGE_FRAME_TOP) : 0;
    const h = Math.max(PAGE_MIN_FRAME_H, PAGE_FRAME_TOP + height + PAGE_FRAME_PAD);
    groups.push({ id: groupId, rect: { x: 0, y, w: PAGE_COLUMN_W, h }, title: chapter.title, ...(chapter.note ? { note: chapter.note } : {}) });
    y += h + PAGE_SECTION_GAP;
  }
  // Then exactly page layout's own arrangement (labels, every tile stacked at the chapter's width), so it opens settled.
  const plan = planPageLayout({ tiles: nodes, frames: groups });
  const at = new Map(plan.moves.map((m) => [m.id, m]));
  const place = <R extends { id: string; rect: { x: number; y: number; w: number; h: number } }>(r: R): R => {
    const m = at.get(r.id);
    return m ? { ...r, rect: { x: m.x, y: m.y, w: m.w ?? r.rect.w, h: m.h ?? r.rect.h } } : r;
  };
  return { camera: { x: 0, y: 0, z: 1 }, nodes: nodes.map(place), groups: groups.map(place), edges: [], shapes: [] };
}

/** Every board the pack makes, top board first, each with its tiles pointed at the made tables. */
export function planPackBoards(board: PackBoard, tables: Record<string, ResolvedTable>, newId?: () => string): PlannedBoard[] {
  return packBoards(board).map((b) => ({ key: b.key, title: b.title, layout: b.layout ?? "canvas", doc: packBoardDocument(b, tables, newId) }));
}

/** Stand-in table ids for the gallery's sketch (nothing is installed until Use template). */
export function sketchTables(tokens: readonly string[]): Record<string, ResolvedTable> {
  return Object.fromEntries(tokens.map((t) => [t, { tableId: `sketch:${t}`, viewIds: {} }]));
}
