"use client";

// features/spaces/editor/database-loading-box.tsx — a database block's loading box, at the height it will have.
//
// Lane SKELETON-HEIGHT (2026-10-17). A streamed or late-seeded database block drew a 120 px box and then its
// frame, and everything under it (the Cap table's callout) moved by the difference. The server knows how many
// rows the person sees (`rows_visible` of `custom.where_id_opens`, see space-seed-context `useBlockExpectedRows`),
// so the box is the loaded frame's height: title, view bar, the grid's wrap, header, one row each, the footer.

import { SKELETON_EMBEDDED_PAGE_ROWS, embeddedGridBodyPx, skeletonRowsFor, ExpectedRows } from "@ai-matrx/records-ui/skeleton";
import type { ReactNode } from "react";

import { useBlockExpectedGroups, useBlockExpectedRows } from "../page/space-seed-context";
import { activeLayout } from "./database-host";

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

/** The loading box of a database block: the loaded frame's height when the server told us the rows, else the default box. */
export function DatabaseLoadingBox({ blockId, p }: { blockId: string; p: Record<string, unknown> }) {
  const framePx = databaseFramePx(p, useBlockExpectedRows(blockId));
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
