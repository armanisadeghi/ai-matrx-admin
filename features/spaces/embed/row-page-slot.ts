// features/spaces/embed/row-page-slot.ts — the space a row's page holds on the record page, reserved BEFORE
// the page arrives so nothing under it moves (layout shift 0; ROW-PAGE-FINISH item 4).
//
// The slot keeps one height per row: the last height its page settled at (kept for the tab's session), else a
// default sized to a typical page. The loading frame, the editor's own loading frame and the settled page all
// sit inside it, so swapping one for the next changes no layout. Shared by the shell (RecordBodySpace) and the
// heavy half (RecordBodySpaceImpl); it imports no editor code.

import { createContext, useContext } from "react";

/** Called by the page when it has settled (or cannot be drawn): everything under the page may show. */
const ReleaseContext = createContext<() => void>(() => undefined);
export const ReleaseProvider = ReleaseContext.Provider;
export const useReleaseSlot = (): (() => void) => useContext(ReleaseContext);

const DEFAULT_RESERVED = "min(32rem, 70dvh)";
const KEY = (recordId: string) => `row-page-slot:${recordId}`;
const memory = new Map<string, number>();

/** The CSS min-height to reserve for this row's page. */
export function reservedHeight(recordId: string): string {
  const kept = memory.get(recordId) ?? readSession(recordId);
  return kept ? `${Math.round(kept)}px` : DEFAULT_RESERVED;
}

/** Keep the height this row's page settled at, so the next open reserves exactly that. */
export function keepSettledHeight(recordId: string, px: number): void {
  if (!(px > 0)) return;
  memory.set(recordId, px);
  try {
    window.sessionStorage.setItem(KEY(recordId), String(Math.round(px)));
  } catch {
    // Session storage is off: the in-memory height still serves this tab's next open.
  }
}

function readSession(recordId: string): number | null {
  try {
    const n = Number(window.sessionStorage.getItem(KEY(recordId)));
    return n > 0 ? n : null;
  } catch {
    return null;
  }
}
