"use client";

// features/spaces/data/database-body-reserve.tsx — the grid body of a database block holds its loaded height.
//
// Lane DB-BLOCK-CHROME-4 (2026-10-19). A table block drew three different bodies before its rows landed:
// the first paint's skeleton (286 px: wrap + header + one row each + the add-row footer, plus an 8 px gap the
// loaded grid does not have), then the live grid's own loading state (226 px: no header, no footer, a one-line
// "Not live" note), then the loaded grid (278 px; 310 px on a phone, where the grid draws a 32 px tools row).
// Everything under the block (the Cap table's callout) moved at each step. Now one number — the loaded grid's
// body, `embeddedGridBodyPx(rows)` for the rows the server said the person sees — is the body's height in all
// three, so nothing under it moves. It is a floor, never a cap, and it lets go at the person's first press or
// key inside the block, so a row they delete is not left as an empty gap.

import { embeddedGridBodyPx, skeletonRowsFor, SKELETON_EMBEDDED_PAGE_ROWS, useExpectedRows } from "@ai-matrx/records-ui/skeleton";
import { useState, type CSSProperties, type ReactNode } from "react";

/** The loaded embedded grid's body height for `rows` rows the person sees, null when it cannot be known. */
export function gridBodyReservePx(rows: number | null | undefined): number | null {
  const drawn = skeletonRowsFor(rows ?? null, SKELETON_EMBEDDED_PAGE_ROWS);
  return drawn !== null && drawn > 0 ? embeddedGridBodyPx(drawn) : null;
}

/** The style that holds a body at `px` (the CSS in spaces.css adds the phone's tools row). */
export function reserveStyle(px: number | null): { attrs: { "data-reserve"?: "" }; style?: CSSProperties } {
  return px === null ? { attrs: {} } : { attrs: { "data-reserve": "" }, style: { ["--spaces-db-body-min" as string]: `${px}px` } };
}

/** A live grid block's body: the loaded height is held while the block loads, released at the first interaction. */
export function ReservedBody({ grid, children }: { grid: boolean; children: ReactNode }) {
  const rows = useExpectedRows(true);
  const [held, setHeld] = useState(true);
  const reserve = held && grid ? reserveStyle(gridBodyReservePx(rows)) : { attrs: {} as { "data-reserve"?: "" }, style: undefined };
  const release = () => setHeld(false);
  return (
    <div className="spaces-db-body" {...reserve.attrs} style={reserve.style} onPointerDownCapture={release} onKeyDownCapture={release}>
      {children}
    </div>
  );
}
