// lib/redux/slices/promptConsumersSlice.ts
//
// Per-consumer filter, sort, and pagination state for prompt list UIs.
//
// Each distinct prompt list UI (the main prompts page, a sidebar picker, an
// embed picker, etc.) registers under a unique consumerId and gets its own
// completely isolated state. Multiple consumers can be alive simultaneously
// without interfering with each other.
//
// Usage pattern:
//   1. On mount:  dispatch(registerConsumer("prompts-main"))
//   2. To filter: dispatch(setConsumerFilter({ consumerId: "prompts-main", patch: { searchTerm: "foo" } }))
//   3. To select: use makeSelectFilteredPrompts("prompts-main") from promptSelectors.ts

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { RootState } from "@/lib/redux/store";

// ── Types (re-exported so selectors and hooks can import from one place) ───────

export type PromptSortOption =
  | "updated-desc"
  | "created-desc"
  | "name-asc"
  | "name-desc"
  | "category-asc";
export type PromptTab = "mine" | "shared" | "all";
export type FavFilter = "all" | "yes" | "no";
export type ArchFilter = "active" | "archived" | "both";

/** Sentinel meaning "include uncategorized / untagged" items. */
export const NONE_SENTINEL = "__none__";

export interface PromptConsumerState {
  tab: PromptTab;
  sortBy: PromptSortOption;
  searchTerm: string;
  /** INCLUSION model: empty = show all; non-empty = only matching. */
  includedCats: string[];
  /** INCLUSION model: empty = show all; non-empty = only matching. */
  includedTags: string[];
  favFilter: FavFilter;
  archFilter: ArchFilter;
  favoritesFirst: boolean;
  /** Current page for owned-prompt list items (after the card section). */
  listPage: number;
  /** Current page for shared-prompt list items. */
  sharedPage: number;
}

export const DEFAULT_CONSUMER_STATE: PromptConsumerState = {
  tab: "mine",
  sortBy: "updated-desc",
  searchTerm: "",
  includedCats: [],
  includedTags: [],
  favFilter: "all",
  archFilter: "active",
  favoritesFirst: true,
  listPage: 1,
  sharedPage: 1,
};

export interface PromptConsumersState {
  consumers: Record<string, PromptConsumerState>;
}

const initialState: PromptConsumersState = {
  consumers: {},
};

// ── Slice ─────────────────────────────────────────────────────────────────────

const promptConsumersSlice = createSlice({
  name: "promptConsumers",
  initialState,
  reducers: {
    /**
     * Register a consumer with its default state.
     * Safe to call multiple times — idempotent (will not reset state if
     * the consumer is already registered).
     */
    registerConsumer: (state, action: PayloadAction<string>) => {
      const consumerId = action.payload;
      if (!state.consumers[consumerId]) {
        state.consumers[consumerId] = { ...DEFAULT_CONSUMER_STATE };
      }
    },

    /**
     * Unregister a consumer and free its state.
     * Call on unmount if the consumer is ephemeral (e.g. a modal picker).
     * Persistent page consumers (e.g. "prompts-main") can skip this.
     */
    unregisterConsumer: (state, action: PayloadAction<string>) => {
      delete state.consumers[action.payload];
    },

    /**
     * Patch any subset of a consumer's filter/sort state.
     * Automatically resets listPage and sharedPage to 1 whenever a
     * filter changes (prevents being stuck on a page with no results).
     *
     * @example
     * dispatch(setConsumerFilter({ consumerId: "prompts-main", patch: { searchTerm: "foo", sortBy: "name-asc" } }))
     */
    setConsumerFilter: (
      state,
      action: PayloadAction<{
        consumerId: string;
        patch: Partial<Omit<PromptConsumerState, "listPage" | "sharedPage">>;
      }>,
    ) => {
      const { consumerId, patch } = action.payload;
      if (!state.consumers[consumerId]) {
        state.consumers[consumerId] = { ...DEFAULT_CONSUMER_STATE };
      }
      Object.assign(state.consumers[consumerId], patch);
      // Reset pagination whenever filters change
      state.consumers[consumerId].listPage = 1;
      state.consumers[consumerId].sharedPage = 1;
    },

    /**
     * Advance the pagination page for a consumer.
     * Only increments; never decrements (consumers use infinite-scroll
     * or "Load more" patterns, not traditional prev/next paging).
     */
    setConsumerPage: (
      state,
      action: PayloadAction<{
        consumerId: string;
        which: "list" | "shared";
        page: number;
      }>,
    ) => {
      const { consumerId, which, page } = action.payload;
      if (!state.consumers[consumerId]) return;
      if (which === "list") state.consumers[consumerId].listPage = page;
      if (which === "shared") state.consumers[consumerId].sharedPage = page;
    },

    /**
     * Reset all filter state for a consumer back to defaults.
     * Keeps the consumer registered; only clears filter/sort/search/page state.
     */
    resetConsumerFilters: (state, action: PayloadAction<string>) => {
      const consumerId = action.payload;
      if (state.consumers[consumerId]) {
        state.consumers[consumerId] = { ...DEFAULT_CONSUMER_STATE };
      }
    },
  },
});

// ── Selectors ─────────────────────────────────────────────────────────────────

const EMPTY_CONSUMERS: Record<string, PromptConsumerState> = {};

export const selectConsumer = (
  state: RootState,
  consumerId: string,
): PromptConsumerState =>
  state.promptConsumers?.consumers[consumerId] ?? DEFAULT_CONSUMER_STATE;

export const selectAllConsumers = (state: RootState) =>
  state.promptConsumers?.consumers ?? EMPTY_CONSUMERS;

// ── Exports ───────────────────────────────────────────────────────────────────

export const {
  registerConsumer,
  unregisterConsumer,
  setConsumerFilter,
  setConsumerPage,
  resetConsumerFilters,
} = promptConsumersSlice.actions;

export default promptConsumersSlice.reducer;
