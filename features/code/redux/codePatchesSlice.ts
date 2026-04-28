/**
 * codePatchesSlice
 *
 * Pending AI-emitted SEARCH/REPLACE patches against open editor tabs.
 *
 * Stream lifecycle:
 *   1. The agent finishes a turn that contains SEARCH/REPLACE blocks.
 *   2. `useApplyAIPatchesToActiveTab` parses the final text via
 *      `parseCodeEdits`, finds which open tab(s) the SEARCH text matches,
 *      and dispatches `stagePatches` once per (tabId, requestId) pair.
 *   3. The pending tray UI lets the user accept / reject individually or
 *      accept-all / reject-all per tab.
 *   4. Accepting applies the patch to the tab buffer (via `updateTabContent`)
 *      so the existing dirty + save pipeline carries the change to disk
 *      (cloud files, library, sandbox FS, mock).
 *
 * The slice itself is dumb: it just holds the staged work. The hook layer
 * owns matching, applying, and reconciling.
 */

import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";

export type PendingPatchStatus = "pending" | "applied" | "rejected";

export interface PendingPatch {
  /** Stable id, unique per (tab, request, block-index). */
  patchId: string;
  /** Tab id this patch targets — same shape as `EditorFile.id`. */
  tabId: string;
  /** SEARCH content (already trimmed by the parser). */
  search: string;
  /** REPLACE content (may be empty for deletions). */
  replace: string;
  /** Conversation that produced this patch. */
  sourceConversationId: string;
  /** Request id within that conversation. Used to dedupe re-stages. */
  sourceRequestId: string;
  /** 0-based index of this block within the request response. */
  blockIndex: number;
  /** Wall-clock ISO timestamp when staged. */
  stagedAt: string;
  status: PendingPatchStatus;
  /** When `status === "rejected"`, optional reason for the audit log. */
  rejectReason?: string;
}

export interface CodePatchesState {
  /** Pending patches grouped by tabId. */
  byTabId: Record<string, PendingPatch[]>;
  /** Set of (conversationId, requestId, tabId) tuples we've already
   *  processed, encoded as `${conversationId}::${requestId}::${tabId}`.
   *  Prevents re-staging on hot-reload or selector churn. */
  seenStageKeys: string[];
}

const initialState: CodePatchesState = {
  byTabId: {},
  seenStageKeys: [],
};

const SEEN_KEYS_CAP = 200;

function makeSeenKey(args: {
  conversationId: string;
  requestId: string;
  tabId: string;
}): string {
  return `${args.conversationId}::${args.requestId}::${args.tabId}`;
}

const slice = createSlice({
  name: "codePatches",
  initialState,
  reducers: {
    /**
     * Stage one or more patches against a tab, scoped to a single
     * (conversation, request) pair so the hook can dedupe cleanly.
     * If we've already seen this stage key, the call is a no-op.
     */
    stagePatches(
      state,
      action: PayloadAction<{
        tabId: string;
        conversationId: string;
        requestId: string;
        patches: Array<{
          search: string;
          replace: string;
          blockIndex: number;
        }>;
      }>,
    ) {
      const { tabId, conversationId, requestId, patches } = action.payload;
      const seenKey = makeSeenKey({ conversationId, requestId, tabId });
      if (state.seenStageKeys.includes(seenKey)) return;
      if (patches.length === 0) {
        // Still mark as seen so we don't retry an empty result on every
        // selector firing.
        state.seenStageKeys.push(seenKey);
        if (state.seenStageKeys.length > SEEN_KEYS_CAP) {
          state.seenStageKeys.splice(
            0,
            state.seenStageKeys.length - SEEN_KEYS_CAP,
          );
        }
        return;
      }

      const stagedAt = new Date().toISOString();
      const list = state.byTabId[tabId] ?? [];
      for (const patch of patches) {
        list.push({
          patchId: `${requestId}:${tabId}:${patch.blockIndex}`,
          tabId,
          search: patch.search,
          replace: patch.replace,
          sourceConversationId: conversationId,
          sourceRequestId: requestId,
          blockIndex: patch.blockIndex,
          stagedAt,
          status: "pending",
        });
      }
      state.byTabId[tabId] = list;

      state.seenStageKeys.push(seenKey);
      if (state.seenStageKeys.length > SEEN_KEYS_CAP) {
        state.seenStageKeys.splice(
          0,
          state.seenStageKeys.length - SEEN_KEYS_CAP,
        );
      }
    },

    markPatchApplied(
      state,
      action: PayloadAction<{ tabId: string; patchId: string }>,
    ) {
      const list = state.byTabId[action.payload.tabId];
      if (!list) return;
      const entry = list.find((p) => p.patchId === action.payload.patchId);
      if (entry) entry.status = "applied";
    },

    markPatchRejected(
      state,
      action: PayloadAction<{
        tabId: string;
        patchId: string;
        reason?: string;
      }>,
    ) {
      const list = state.byTabId[action.payload.tabId];
      if (!list) return;
      const entry = list.find((p) => p.patchId === action.payload.patchId);
      if (entry) {
        entry.status = "rejected";
        entry.rejectReason = action.payload.reason;
      }
    },

    /** Drop all patches (any status) for a tab — used when the tab is
     *  closed, or after the user clears the tray. */
    clearPatchesForTab(state, action: PayloadAction<{ tabId: string }>) {
      delete state.byTabId[action.payload.tabId];
    },

    /** Drop only finished (applied + rejected) patches; keep pending. */
    clearResolvedPatchesForTab(
      state,
      action: PayloadAction<{ tabId: string }>,
    ) {
      const list = state.byTabId[action.payload.tabId];
      if (!list) return;
      state.byTabId[action.payload.tabId] = list.filter(
        (p) => p.status === "pending",
      );
      if (state.byTabId[action.payload.tabId].length === 0) {
        delete state.byTabId[action.payload.tabId];
      }
    },

    clearAllPatches(state) {
      state.byTabId = {};
      state.seenStageKeys = [];
    },
  },
});

export const {
  stagePatches,
  markPatchApplied,
  markPatchRejected,
  clearPatchesForTab,
  clearResolvedPatchesForTab,
  clearAllPatches,
} = slice.actions;

export default slice.reducer;

// ─── Selectors ──────────────────────────────────────────────────────────────

type WithCodePatches = { codePatches: CodePatchesState };

const EMPTY_PATCH_LIST: PendingPatch[] = [];

export const selectCodePatches = (state: WithCodePatches) =>
  state.codePatches ?? initialState;

/**
 * Returns the raw patch list for a tab, or a stable empty array. The
 * inner selector reads a slice ref directly so it's safe to call
 * `useAppSelector` on without further memoization — the only allocation
 * happens when the slice itself changes.
 */
export const selectAllPatchesForTab =
  (tabId: string | null | undefined) =>
  (state: WithCodePatches): PendingPatch[] => {
    if (!tabId) return EMPTY_PATCH_LIST;
    return selectCodePatches(state).byTabId[tabId] ?? EMPTY_PATCH_LIST;
  };

/**
 * Returns only the `pending` patches for a tab. `.filter()` allocates a
 * new array, so this MUST be memoized with `createSelector` — otherwise
 * React-Redux's `inputStabilityCheck` (dev-only, runs the selector
 * twice per render) sees two different array references and fires the
 * "Selector unknown returned a different result" warning.
 *
 * Factory pattern: callers should `useMemo(() => selectPendingPatchesForTab(tabId), [tabId])`
 * so the same memoized instance is reused across renders (Rule 7 in
 * `.cursor/skills/redux-selector-rules`). Without that, every render
 * creates a fresh selector with an empty cache — still safe (each
 * instance is internally consistent within a single render) but it
 * forces the filter to recompute on every selector read.
 */
export const selectPendingPatchesForTab = (tabId: string | null | undefined) =>
  createSelector([selectAllPatchesForTab(tabId)], (all): PendingPatch[] =>
    all.length === 0
      ? EMPTY_PATCH_LIST
      : all.filter((p) => p.status === "pending"),
  );

/**
 * Count of pending patches for a tab. Built on top of the memoized
 * pending selector so we don't re-filter the list when callers only
 * need the count. Returns a primitive, so no extra memoization is
 * required at the use site.
 */
export const selectPendingPatchCountForTab = (
  tabId: string | null | undefined,
) => {
  const pending = selectPendingPatchesForTab(tabId);
  return (state: WithCodePatches): number => pending(state).length;
};

/**
 * Stable list of every tab id that currently has at least one
 * `pending` patch, in tab-strip order. Used by `<TabDiffView>` to
 * power the "previous file / next file" navigation buttons in the
 * top toolbar. Memoized so the array reference is stable across
 * unrelated state changes.
 */
const EMPTY_ID_LIST: string[] = [];

export const selectTabIdsWithPendingChanges = createSelector(
  [
    (state: WithCodePatches) => selectCodePatches(state).byTabId,
    (
      state: WithCodePatches & {
        codeTabs?: { order?: string[] };
      },
    ): string[] => state.codeTabs?.order ?? EMPTY_ID_LIST,
  ],
  (byTabId, order): string[] => {
    if (!order || order.length === 0) return EMPTY_ID_LIST;
    const out = order.filter((tabId) => {
      const list = byTabId[tabId];
      return Boolean(list && list.some((p) => p.status === "pending"));
    });
    return out.length === 0 ? EMPTY_ID_LIST : out;
  },
);
