/**
 * Shared Tailwind class tokens for the VSCode-style workspace UI.
 *
 * Centralizing these keeps the Activity Bar, Side Panel, Editor, and Terminal
 * looking like one cohesive surface instead of three different opinions on
 * "what a neutral gray should be".
 */

/** The full-workspace background (slightly lighter than the page so the
 *  workspace reads as a contained widget). */
export const WORKSPACE_BG = "bg-neutral-50 dark:bg-neutral-950";

/** Activity-bar column background. */
export const ACTIVITY_BAR_BG = "bg-neutral-100 dark:bg-neutral-900";

/** Side panel (file tree / search / etc.) background. */
export const SIDE_PANEL_BG =
  "bg-neutral-50 dark:bg-neutral-925 dark:bg-[#181818]";

/** Tab strip background (above the editor). */
export const TAB_STRIP_BG = "bg-neutral-100 dark:bg-neutral-900";

/** Editor background. Monaco paints its own background on top of this. */
export const EDITOR_BG = "bg-white dark:bg-neutral-950";

/** Bottom panel background. */
export const BOTTOM_PANEL_BG = "bg-neutral-50 dark:bg-[#181818]";

/** Status bar background. */
export const STATUS_BAR_BG = "bg-blue-600 dark:bg-blue-700 text-white";

/** Thin hairline border used between all major panes. */
export const PANE_BORDER = "border-neutral-200 dark:border-neutral-800";

/** Header row height used across panel headers. */
export const HEADER_HEIGHT = "h-9";

/** Row height for items in the file tree + list-style panels. */
export const ROW_HEIGHT = "h-6";

export const TEXT_MUTED = "text-neutral-500 dark:text-neutral-400";
export const TEXT_BODY = "text-neutral-800 dark:text-neutral-200";
export const TEXT_HEADER =
  "text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400";

export const HOVER_ROW = "hover:bg-neutral-200/70 dark:hover:bg-neutral-800/60";

export const ACTIVE_ROW =
  "bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50";
