"use client";

// features/spaces/editor/database-loading-box.tsx — a database block's loading box, at the height it will have.
//
// Lane SKELETON-HEIGHT (2026-10-17). A streamed or late-seeded database block drew a 120 px box and then its
// frame, and everything under it (the Cap table's callout) moved by the difference. The server knows how many
// rows the person sees (`rows_visible` of `custom.where_id_opens`, see space-seed-context `useBlockExpectedRows`),
// so the box is the loaded frame's height: title, view bar, the grid's wrap, header, one row each, the footer.

import { SKELETON_EMBEDDED_PAGE_ROWS, embeddedGridBodyPx, skeletonRowsFor, ExpectedRows } from "@ai-matrx/records-ui/skeleton";
import { createContext, useContext, type ReactNode } from "react";

import { DatabaseFrameShape } from "../data/database-frame-shape";
import { useBlockExpectedGroups, useBlockExpectedRows } from "../page/space-seed-context";
import { useStructureEdit } from "../page/structure";
import { activeLayout, paintedSizesOf, pickPainted } from "./database-host";

/** The database frame's own chrome (spaces.css `.spaces-db-frame`): 1 px border and 14 + 10 px padding. */
const FRAME_CHROME_PX = 26;
/** The frame's rows are 4 px apart; the view bar is 32 px; the title row is 34 px. */
const FRAME_GAP_PX = 4;
const BAR_PX = 32;
const TITLE_PX = 34;
/** The frame's own vertical margin (`margin: 4px 0`). */
const FRAME_MARGIN_PX = 4;

/**
 * The height (px) a grid database block's frame will have with `rows` rows, or null when it cannot be known
 * (not a grid, or no rows to size by — an empty table draws its own empty state).
 */
export function databaseFramePx(p: Record<string, unknown>, rows: number | null): number | null {
  if (rows === null || rows <= 0 || activeLayout(p) !== "grid") return null;
  const drawn = skeletonRowsFor(rows, SKELETON_EMBEDDED_PAGE_ROWS);
  if (drawn === null || drawn <= 0) return null;
  const titled = p["showTitle"] !== false;
  return FRAME_CHROME_PX + BAR_PX + embeddedGridBodyPx(drawn) + (titled ? TITLE_PX + 2 * FRAME_GAP_PX : FRAME_GAP_PX);
}

/**
 * The loading box of a database block. A table source draws its FRAME (data/database-frame-shape.tsx): the
 * live frame's own chrome for this person's role and records-ui's skeleton painting the rows the server said
 * they see, so the live mount changes nothing geometric (DB-BLOCK-CHROME). While the rows are not known it
 * holds the size the block was last painted at (its stored `paintedSize`, the same on server and client). A
 * built-in source keeps the plain box. `editable` = the page takes edits for this person (false on the
 * server's read-only first paint); structure controls follow `useStructureEdit` like the live frame's.
 */
export function DatabaseLoadingBox({ blockId, p, editable = false, published = false }: { blockId: string; p: Record<string, unknown>; editable?: boolean; published?: boolean }) {
  const rows = useBlockExpectedRows(blockId);
  const groups = useBlockExpectedGroups(blockId);
  const structure = useStructureEdit();
  const painted = pickPainted(paintedSizesOf(p), {}, true)?.h;
  const held = rows === null && painted ? Math.max(0, painted - 2 * FRAME_MARGIN_PX) : null;
  const source = p["source"] as { kind?: unknown } | undefined;
  if (source?.kind === "table")
    return <DatabaseFrameShape p={p} role={{ shape: editable && structure, published }} rows={rows} groups={groups} minHeight={held} />;
  const framePx = databaseFramePx(p, rows) ?? held;
  if (framePx === null) return <div className="spaces-db-loading" />;
  return <div className="spaces-db-loading" style={{ minHeight: framePx, margin: `${FRAME_MARGIN_PX}px 0` }} data-expected-frame={framePx} />;
}

/** The block's content, told how many rows its table shows the person: its own loading frames paint that many. */
export function WithExpectedRows({ blockId, children }: { blockId: string; children: ReactNode }) {
  return (
    <ExpectedRows rows={useBlockExpectedRows(blockId)} groups={useBlockExpectedGroups(blockId)}>
      {children}
    </ExpectedRows>
  );
}

/**
 * The loading box a database block's code chunk draws while it loads (next/dynamic's `loading` gets no
 * props): the host puts the block's own DatabaseLoadingBox here, so the chunk's wait is the frame's shape
 * too, never a bare 120 px box (DB-BLOCK-CHROME).
 */
const LoadingSlotContext = createContext<ReactNode>(null);
export function DatabaseLoadingSlot({ box, children }: { box: ReactNode; children: ReactNode }) {
  return <LoadingSlotContext.Provider value={box}>{children}</LoadingSlotContext.Provider>;
}
export function DatabaseChunkLoading() {
  return <>{useContext(LoadingSlotContext) ?? <div className="spaces-db-loading" />}</>;
}
