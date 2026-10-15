/**
 * AUTO-OPENED WINDOW PLACEMENT (MKT-104, Arman 2026-10-15).
 *
 * Some windows open by themselves (debug mode's Workflow run + Watch AI windows) so a person can
 * watch progress live. They must NEVER cover the page's working column or take its clicks. This
 * is the ONE place that decides where such a window goes, for every window that is opened by the
 * system rather than by a person:
 *
 *   1. The caller marks the open with `markAutoOpened(overlayId, instanceId)` (see
 *      `features/overlays/openers/openAutoOverlay.ts`); `WindowPanel` consumes the mark.
 *   2. The working column is measured from the page itself: the bounds of every visible control
 *      (button, link, field) in the page body. Anything outside that box takes no clicks anyway.
 *   3. The window is docked in the widest free side gutter, shrunk to fit, stacked under any other
 *      auto-opened window already there. No gutter wide enough (a narrow screen, a page that
 *      fills the width) → it is not opened (`autoOpenHasRoom`), or, when the page grew under it,
 *      it closes itself. A person's own press of Watch AI / Workflow run always opens it.
 *
 * Pure module: no Redux import (WindowPanel stays a leaf).
 */

import type { WindowRect } from "@/lib/redux/slices/windowManagerSlice";

const MARKS = Symbol.for("matrx.windowPanels.autoOpenedMarks");
const GAP = 12;
const SIBLING_GAP = 8;
/** Narrowest window worth docking; anything tighter goes to the tray. */
export const AUTO_OPEN_MIN_WIDTH = 280;

function marks(): Set<string> {
  const host = globalThis as unknown as Record<symbol, Set<string>>;
  return (host[MARKS] ??= new Set<string>());
}

const markKey = (overlayId: string, instanceId: string) =>
  `${overlayId}::${instanceId}`;

/** Call BEFORE dispatching the open of a window the system (not a person) opens. */
export function markAutoOpened(overlayId: string, instanceId: string): void {
  marks().add(markKey(overlayId, instanceId));
}

/** Peek (does not consume, so StrictMode's double render sees the same answer). */
export function isAutoOpened(overlayId: string, instanceId: string): boolean {
  return marks().has(markKey(overlayId, instanceId));
}

/** Forget the mark once the window is gone: a person's later reopen places normally. */
export function clearAutoOpened(overlayId: string, instanceId: string): void {
  marks().delete(markKey(overlayId, instanceId));
}

const CONTROL_SELECTOR =
  'button, a[href], input, textarea, select, [role="button"], [role="tab"], [data-clickable]';

/** Left/right edge of everything on the page body that takes a click. */
export function measureWorkingColumn(): { left: number; right: number } | null {
  if (typeof document === "undefined") return null;
  const root =
    document.querySelector<HTMLElement>("[data-matrx-page-scroll]") ??
    document.querySelector<HTMLElement>("main") ??
    document.querySelector<HTMLElement>(".shell-main");
  if (!root) return null;
  const rootRect = root.getBoundingClientRect();
  let left = Infinity;
  let right = -Infinity;
  const nodes = root.querySelectorAll<HTMLElement>(CONTROL_SELECTOR);
  const limit = Math.min(nodes.length, 600);
  for (let i = 0; i < limit; i += 1) {
    const el = nodes[i];
    // Skip controls inside floating windows themselves.
    if (el.closest("[data-window-panel], [data-matrx-window]")) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) continue;
    if (r.bottom < rootRect.top || r.top > rootRect.bottom) continue;
    if (r.right < 0 || r.left > window.innerWidth) continue;
    left = Math.min(left, r.left);
    right = Math.max(right, r.right);
  }
  return Number.isFinite(left) ? { left, right } : null;
}

/**
 * True when a gutter beside the page's working column can hold an auto-opened window right now.
 * Callers that open windows by themselves check this FIRST: with no room the window is not opened
 * (a parked tray tile sits over the page's own bottom-right controls — MKT-104).
 */
export function autoOpenHasRoom(): boolean {
  if (typeof window === "undefined") return false;
  const vw = window.innerWidth;
  if (vw < 768) return false;
  const column = measureWorkingColumn();
  if (!column) return true;
  const leftRoot =
    document.querySelector<HTMLElement>("main")?.getBoundingClientRect().left ?? 0;
  const free = Math.max(vw - column.right - GAP * 2, column.left - leftRoot - GAP * 2);
  return free >= AUTO_OPEN_MIN_WIDTH;
}

export interface AutoOpenPlacement {
  rect: WindowRect;
  /** True when no gutter fits: open parked in the tray instead of over the page. */
  minimized: boolean;
}

/**
 * @param siblings rects of auto-opened windows already docked (to stack under them)
 */
export function resolveAutoOpenPlacement(args: {
  width: number;
  height: number;
  minWidth: number;
  minHeight: number;
  top: number;
  viewport: { vw: number; vh: number };
  siblings: WindowRect[];
}): AutoOpenPlacement {
  const { vw, vh } = args.viewport;
  const column = measureWorkingColumn();
  const rightFree = column ? vw - column.right - GAP * 2 : vw;
  const leftRoot =
    typeof document !== "undefined"
      ? (document.querySelector<HTMLElement>("main")?.getBoundingClientRect()
          .left ?? 0)
      : 0;
  const leftFree = column ? column.left - leftRoot - GAP * 2 : 0;
  const side = rightFree >= leftFree ? "right" : "left";
  const free = Math.max(rightFree, leftFree);
  const need = Math.min(args.minWidth, AUTO_OPEN_MIN_WIDTH);
  const parked: AutoOpenPlacement = {
    rect: {
      x: Math.max(GAP, vw - args.width - GAP),
      y: args.top,
      width: args.width,
      height: args.height,
    },
    minimized: true,
  };
  if (free < need) return parked;

  const width = Math.max(need, Math.min(args.width, Math.floor(free)));
  const x =
    side === "right"
      ? vw - width - GAP
      : Math.max(GAP, Math.round(leftRoot + GAP));
  // Stack below the lowest sibling in this gutter.
  const inGutter = args.siblings.filter(
    (s) => s.x + s.width > x && s.x < x + width,
  );
  const y = inGutter.length
    ? Math.max(...inGutter.map((s) => s.y + s.height)) + SIBLING_GAP
    : args.top;
  const room = vh - y - GAP;
  if (room < args.minHeight) return parked;
  const share = inGutter.length ? room : Math.floor((vh - args.top - GAP) / 2);
  const height = Math.min(room, Math.max(args.minHeight, Math.min(args.height, share)));
  return { rect: { x, y, width, height }, minimized: false };
}
