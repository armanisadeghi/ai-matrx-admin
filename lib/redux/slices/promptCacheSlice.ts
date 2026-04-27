// lib/redux/slices/promptCacheSlice.ts

import { createSelector, createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  PromptData,
  PromptMessage,
  PromptSettings,
  PromptVariable,
} from "@/features/prompts/types/core";
import type { PermissionLevel } from "@/utils/permissions/types";

/**
 * Prompt Cache Slice
 *
 * Stores fetched prompts in Redux to avoid redundant database queries.
 * Prompts are cached for the entire session after first fetch.
 *
 * Benefits:
 * - Fetch once, use forever
 * - Instant prompt opening (no loading state)
 * - Reduced database load
 * - Future: Pre-fetch common prompts after login
 */

export interface CachedPrompt {
  id: string;
  name: string;
  description?: string;
  messages: PromptMessage[];
  variableDefaults?: PromptVariable[];
  settings: PromptSettings;
  userId: string;
  source: "prompts" | "prompt_builtins";
  fetchedAt: number;
  status: "cached" | "stale";
  tags?: string[];
  category?: string;
  isArchived?: boolean;
  isFavorite?: boolean;
  modelId?: string;
  outputFormat?: string;
  outputSchema?: unknown;
  tools?: unknown;
}

export type ListStatus = "idle" | "loading" | "success" | "error";

/**
 * A prompt shared with the current user from someone else's library.
 * Returned by the `get_prompts_shared_with_me` RPC.
 *
 * Permission hierarchy:  viewer < editor < admin
 *   viewer  — read only (open & run)
 *   editor  — can update messages, settings, variable_defaults, name, description
 *   admin   — full access including delete and re-sharing
 */
export interface SharedPromptRecord {
  id: string;
  name: string;
  description?: string | null;
  permissionLevel: PermissionLevel;
  ownerEmail: string;
  // Derived helpers — computed once on load, never re-derived at render time
  canEdit: boolean; // permissionLevel >= 'editor'
  canDelete: boolean; // permissionLevel === 'admin'
}

export interface PromptCacheState {
  // Per-ID cache — used by the execution pipeline (open/run prompts)
  prompts: {
    [promptId: string]: CachedPrompt;
  };
  // Per-ID fetch status — guards against duplicate in-flight requests
  fetchStatus: {
    [promptId: string]: "idle" | "loading" | "success" | "error";
  };

  // Flat list of the current user's OWN prompts — used by CRUD / management UIs
  allPrompts: PromptData[];
  listStatus: ListStatus;
  listError: string | null;
  /** Unix timestamp (ms) of the last successful fetchAllUserPrompts. Used for TTL-based staleness. */
  lastFetchedAt: number | null;

  // Prompts shared with the current user by others
  sharedPrompts: SharedPromptRecord[];
  sharedListStatus: ListStatus;
  sharedListError: string | null;
}

const initialState: PromptCacheState = {
  prompts: {},
  fetchStatus: {},
  allPrompts: [],
  listStatus: "idle",
  listError: null,
  lastFetchedAt: null,
  sharedPrompts: [],
  sharedListStatus: "idle",
  sharedListError: null,
};

const promptCacheSlice = createSlice({
  name: "promptCache",
  initialState,
  reducers: {
    // Add or update a prompt in cache
    cachePrompt: (state, action: PayloadAction<CachedPrompt>) => {
      const prompt = action.payload;
      state.prompts[prompt.id] = prompt;
      state.fetchStatus[prompt.id] = "success";
    },

    // Update fetch status (for loading states)
    setFetchStatus: (
      state,
      action: PayloadAction<{
        promptId: string;
        status: "idle" | "loading" | "success" | "error";
      }>,
    ) => {
      const { promptId, status } = action.payload;
      state.fetchStatus[promptId] = status;
    },

    // Remove a prompt from cache (if needed for cache invalidation)
    removePrompt: (state, action: PayloadAction<string>) => {
      const promptId = action.payload;
      delete state.prompts[promptId];
      delete state.fetchStatus[promptId];
    },

    // Mark prompt as stale (for future cache invalidation)
    markPromptStale: (state, action: PayloadAction<string>) => {
      const promptId = action.payload;
      if (state.prompts[promptId]) {
        state.prompts[promptId].status = "stale";
      }
    },

    // Clear entire cache (useful for logout)
    clearCache: (state) => {
      state.prompts = {};
      state.fetchStatus = {};
      state.allPrompts = [];
      state.listStatus = "idle";
      state.listError = null;
      state.sharedPrompts = [];
      state.sharedListStatus = "idle";
      state.sharedListError = null;
    },

    // ── List state (for CRUD / management UIs) ──────────────────────────────

    /** Replace the entire prompt list (used after fetchAll). */
    setPromptList: (state, action: PayloadAction<PromptData[]>) => {
      state.allPrompts = action.payload;
      state.listStatus = "success";
      state.listError = null;
      state.lastFetchedAt = Date.now();
    },

    /** Set the list-level fetch status and optional error message. */
    setListStatus: (
      state,
      action: PayloadAction<{ status: ListStatus; error?: string }>,
    ) => {
      state.listStatus = action.payload.status;
      state.listError = action.payload.error ?? null;
    },

    /**
     * Insert or update a single prompt in the flat list.
     * Used after create / update / upsert so the list stays in sync without
     * a full re-fetch.
     */
    upsertPromptInList: (state, action: PayloadAction<PromptData>) => {
      const incoming = action.payload;
      const idx = state.allPrompts.findIndex((p) => p.id === incoming.id);
      if (idx !== -1) {
        state.allPrompts[idx] = incoming;
      } else {
        // Prepend so newest appears first (matches updated_at DESC order)
        state.allPrompts.unshift(incoming);
      }
    },

    /** Remove a prompt from the flat list by ID (used after delete). */
    removePromptFromList: (state, action: PayloadAction<string>) => {
      state.allPrompts = state.allPrompts.filter(
        (p) => p.id !== action.payload,
      );
    },

    // ── Shared prompts (prompts shared with the current user by others) ───────

    /** Replace the entire shared-prompts list (used after fetchSharedWithMe). */
    setSharedPromptList: (
      state,
      action: PayloadAction<SharedPromptRecord[]>,
    ) => {
      state.sharedPrompts = action.payload;
      state.sharedListStatus = "success";
      state.sharedListError = null;
    },

    /** Set the shared-list fetch status and optional error message. */
    setSharedListStatus: (
      state,
      action: PayloadAction<{ status: ListStatus; error?: string }>,
    ) => {
      state.sharedListStatus = action.payload.status;
      state.sharedListError = action.payload.error ?? null;
    },

    /**
     * Update a single shared-prompt entry in the list.
     * Used when an editor-level mutation comes back from the DB so the list
     * reflects the saved name / description immediately.
     */
    upsertSharedPromptInList: (
      state,
      action: PayloadAction<SharedPromptRecord>,
    ) => {
      const incoming = action.payload;
      const idx = state.sharedPrompts.findIndex((p) => p.id === incoming.id);
      if (idx !== -1) {
        // Preserve the original permissionLevel — the owner controls that, not us
        state.sharedPrompts[idx] = {
          ...incoming,
          permissionLevel: state.sharedPrompts[idx].permissionLevel,
          canEdit: state.sharedPrompts[idx].canEdit,
          canDelete: state.sharedPrompts[idx].canDelete,
        };
      }
    },

    /**
     * Remove a shared prompt from the list.
     * Used when an admin-level delete succeeds, or when the owner revokes access.
     */
    removeSharedPromptFromList: (state, action: PayloadAction<string>) => {
      state.sharedPrompts = state.sharedPrompts.filter(
        (p) => p.id !== action.payload,
      );
      // Also evict from the execution cache — no longer accessible
      delete state.prompts[action.payload];
      delete state.fetchStatus[action.payload];
    },
  },
});

// ── Raw slice accessors (inputs to memoized selectors) ────────────────────

const selectPromptCacheSlice = (state: WithPromptCache) => state.promptCache;
const selectAllPromptsRaw = (state: WithPromptCache) => state.promptCache?.allPrompts;
const selectSharedPromptsRaw = (state: WithPromptCache) =>
  state.promptCache?.sharedPrompts;

// ── Selectors: per-ID execution cache ─────────────────────────────────────

type WithPromptCache = { promptCache: PromptCacheState };

export const selectCachedPrompt = (state: WithPromptCache, promptId: string) =>
  state.promptCache?.prompts[promptId];

export const selectIsPromptCached = (state: WithPromptCache, promptId: string) =>
  !!state.promptCache?.prompts[promptId];

export const selectPromptFetchStatus = (state: WithPromptCache, promptId: string) =>
  state.promptCache?.fetchStatus[promptId] ?? "idle";

export const selectAllCachedPrompts = (state: WithPromptCache) =>
  state.promptCache?.prompts;

// ── Selectors: flat list (CRUD / management UIs) ───────────────────────────

export const selectAllUserPrompts = (
  state: WithPromptCache,
): PromptData[] | undefined => state.promptCache?.allPrompts;

export const selectUserPromptById = (
  state: WithPromptCache,
  id: string,
): PromptData | undefined =>
  state.promptCache?.allPrompts.find((p) => p.id === id);

export const selectPromptsListStatus = (state: WithPromptCache): ListStatus =>
  state.promptCache?.listStatus ?? "idle";

export const selectPromptsListError = (state: WithPromptCache): string | null =>
  state.promptCache?.listError ?? null;

export const selectPromptsListIsLoading = (state: WithPromptCache): boolean =>
  state.promptCache?.listStatus === "loading";

export const selectPromptsLastFetchedAt = (state: WithPromptCache): number | null =>
  state.promptCache?.lastFetchedAt ?? null;

// ── Selectors: shared prompts ──────────────────────────────────────────────

export const selectSharedPrompts = (
  state: WithPromptCache,
): SharedPromptRecord[] | undefined => state.promptCache?.sharedPrompts;

export const selectSharedPromptById = (
  state: WithPromptCache,
  id: string,
): SharedPromptRecord | undefined =>
  state.promptCache?.sharedPrompts.find((p) => p.id === id);

export const selectSharedPromptsListStatus = (state: WithPromptCache): ListStatus =>
  state.promptCache?.sharedListStatus ?? "idle";

export const selectSharedPromptsListError = (state: WithPromptCache): string | null =>
  state.promptCache?.sharedListError ?? null;

export const selectSharedPromptsIsLoading = (state: WithPromptCache): boolean =>
  state.promptCache?.sharedListStatus === "loading";

const EMPTY_PROMPT_DATA: PromptData[] = [];
const EMPTY_SHARED_RECORDS: SharedPromptRecord[] = [];
const EMPTY_STRING_ARRAY: string[] = [];

/**
 * Memoized — prompts the current user can edit (own + editor/admin shared).
 * Returns a stable object reference when neither list has changed.
 */
export const selectEditablePrompts = createSelector(
  [selectAllPromptsRaw, selectSharedPromptsRaw],
  (allPrompts, sharedPrompts) => {
    const owned = allPrompts ?? EMPTY_PROMPT_DATA;
    const shared = sharedPrompts ?? EMPTY_SHARED_RECORDS;
    const sharedEditable = shared.filter((p) => p.canEdit);
    return {
      ownedPrompts: owned,
      sharedEditable:
        sharedEditable.length === 0 ? EMPTY_SHARED_RECORDS : sharedEditable,
    };
  },
);

/**
 * Memoized — all unique prompt IDs the current user can at minimum VIEW.
 * Returns a stable array reference when neither list has changed.
 */
export const selectAllAccessiblePromptIds = createSelector(
  [selectAllPromptsRaw, selectSharedPromptsRaw],
  (allPrompts, sharedPrompts): string[] => {
    if (!allPrompts && !sharedPrompts) return EMPTY_STRING_ARRAY;
    const ownedIds = (allPrompts ?? EMPTY_PROMPT_DATA).map((p) => p.id!);
    const sharedIds = (sharedPrompts ?? EMPTY_SHARED_RECORDS).map((p) => p.id);
    const merged = [...new Set([...ownedIds, ...sharedIds])];
    return merged.length === 0 ? EMPTY_STRING_ARRAY : merged;
  },
);

export const {
  cachePrompt,
  setFetchStatus,
  removePrompt,
  markPromptStale,
  clearCache,
  // Owned list actions
  setPromptList,
  setListStatus,
  upsertPromptInList,
  removePromptFromList,
  // Shared list actions
  setSharedPromptList,
  setSharedListStatus,
  upsertSharedPromptInList,
  removeSharedPromptFromList,
} = promptCacheSlice.actions;

export default promptCacheSlice.reducer;
