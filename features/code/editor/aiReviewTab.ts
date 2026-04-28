/**
 * AI Review Tab — singleton helper.
 *
 * The multi-file Cursor-style review surface lives in a single special
 * editor tab so it sits in the regular tab strip, can be focused with
 * `setActiveTab`, and uses the same close-button affordance as any other
 * tab. We never want more than one of these open at once — patches are
 * global to the workspace, not per-conversation, so a single review pane
 * is the right model.
 *
 * This module owns the shape of the synthetic review tab and exports a
 * thunk-style action creator (`ensureReviewTab`) that callers can dispatch
 * to lazily create it. The action is idempotent: dispatching twice does
 * not duplicate the tab.
 */

import type { Dispatch } from "@reduxjs/toolkit";
import { ensureTab, openTab } from "../redux/tabsSlice";
import type { EditorFile } from "../types";

/** Stable id for the singleton review tab. Not a real filesystem path. */
export const REVIEW_TAB_ID = "ai-review:default";

/** Path shown in tooltips / debug UIs for the review tab. */
export const REVIEW_TAB_PATH = "ai-review://default";

/** Display name shown on the tab. */
export const REVIEW_TAB_NAME = "AI Review";

/**
 * Build the synthetic `EditorFile` we pass to `openTab`. Kept as a function
 * so each open creates a fresh object — `openTab` reads it once and stores
 * it under `byId`, so this is safe.
 */
export function buildReviewTab(): EditorFile {
  return {
    id: REVIEW_TAB_ID,
    path: REVIEW_TAB_PATH,
    name: REVIEW_TAB_NAME,
    language: "plaintext",
    content: "",
    pristineContent: "",
    dirty: false,
    kind: "ai-review",
  };
}

/**
 * Returns true iff the given tab id is the singleton review tab.
 */
export function isReviewTabId(id: string | null | undefined): boolean {
  return id === REVIEW_TAB_ID;
}

/**
 * Ensure the review tab is in the strip without changing focus. Returns
 * a dispatchable function — callers can do `dispatch(ensureReviewTab())`.
 * We don't reach for `createAsyncThunk` because no async work is involved;
 * this is a synchronous lazy-init over `ensureTab`'s idempotency.
 *
 * Use this on the auto-open path (patches just landed, but the user might
 * still be reading another file). Use `openReviewTab` when an explicit
 * user action should focus the review surface.
 */
export function ensureReviewTab() {
  return (dispatch: Dispatch) => {
    dispatch(ensureTab(buildReviewTab()));
  };
}

/**
 * Open the review tab AND make it the active tab. Use on explicit user
 * actions (clicking "Open full review", etc.) — never on auto-open.
 */
export function openReviewTab() {
  return (dispatch: Dispatch) => {
    dispatch(openTab(buildReviewTab()));
  };
}
