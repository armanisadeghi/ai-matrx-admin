/**
 * Dock position — the pure half of "drag the assists dock out of my way".
 *
 * Stored as an offset from the BOTTOM-RIGHT corner (not left/top) so the dock
 * keeps its relationship to the window tray and the composer band when the
 * window is resized, and so the default (no stored position) is expressible as
 * `null` rather than a magic pair of numbers.
 *
 * The drag, the clamp (every render, never only on drop) and the click-vs-drag
 * threshold are `@ai-matrx/summon/dock` (`useDock`); this file holds only the
 * dock's stored shape and its numbers. Persisted per user in
 * `preferences.assists.dockPosition`.
 */

export interface DockOffset {
  /** px from the right edge of the viewport. */
  right: number;
  /** px from the bottom edge of the viewport. */
  bottom: number;
}

/** The dock's own footprint — how much must stay on screen to grab it. */
export const DOCK_MIN_VISIBLE = { width: 120, height: 32 } as const;

/** Default resting place on a desktop viewport — just above the window tray. */
export const DEFAULT_DOCK_OFFSET: DockOffset = { right: 12, bottom: 56 };
