"use client";
// features/prompts/hooks/useAgentConsumer.ts
//
// Single hook that wires a component to the agent cache system.
//
// Usage:
//   const consumer = useAgentConsumer("agent-picker");
//   consumer.owned          // AgentRecord[] - owned agents after filtering
//   consumer.builtins       // AgentRecord[] - system agents after filtering
//   consumer.shared         // AgentRecord[] - shared agents after filtering
//   consumer.isLoading      // true while any source is fetching
//   consumer.selectAgent(id, source) // fetches operational data + calls callback
//
// Filter/sort state reuses promptConsumersSlice — same reducers, same consumer IDs.
// This means an agent picker and a prompt picker can share state if they use
// the same consumerId, or be fully independent with different IDs.
//
// Tab visibility refresh:
//   When a tab is restored after > 4 hours of inactivity, all agent sources
//   are re-fetched in the background. The UI does not block during this.

import { useEffect, useCallback, useMemo, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  registerConsumer,
  unregisterConsumer,
  setConsumerFilter,
  setConsumerPage,
  resetConsumerFilters,
  selectConsumer,
  DEFAULT_CONSUMER_STATE,
} from "@/lib/redux/slices/promptConsumersSlice";
import type {
  PromptConsumerState,
  PromptSortOption,
  PromptTab,
  FavFilter,
  ArchFilter,
} from "@/lib/redux/slices/promptConsumersSlice";
import {
  selectAgentFetchStatus,
  selectOwnedHasMore,
  selectSharedHasMore,
  selectOwnedCursor,
  type AgentRecord,
  type AgentSource,
} from "@/lib/redux/slices/agentCacheSlice";
import {
  makeSelectFilteredOwnedAgents,
  makeSelectFilteredBuiltinAgents,
  makeSelectFilteredSharedAgents,
  makeSelectAgentSlimList,
  makeSelectAgentHasActiveFilters,
} from "@/lib/redux/selectors/agentSelectors";
import {
  fetchAgentSlimList,
  fetchAgentCoreBatch,
  fetchAgentOperational,
  refreshAgents,
  AGENT_PAGE_SIZE,
} from "@/lib/redux/thunks/agentFetchThunks";

// Re-export types for consumers
export type {
  PromptSortOption,
  PromptTab,
  FavFilter,
  ArchFilter,
  AgentRecord,
  AgentSource,
};

// ── Stable fallbacks (module-level so they never change reference) ────────────
const EMPTY_ARRAY: never[] = [];
const SELECT_NULL = () => null as null;
const SELECT_EMPTY_ARRAY = () => EMPTY_ARRAY;

// ── Hook options ──────────────────────────────────────────────────────────────

export interface UseAgentConsumerOptions {
  /** If true, consumer state is cleared from Redux when the component unmounts. */
  ephemeral?: boolean;
  /**
   * 'filtered' — returns all agents with consumer's current filter/sort applied (default).
   * 'slim'     — returns capped sidebar slices (3 per source) without full filtering.
   */
  mode?: "filtered" | "slim";
  /** For slim mode: max agents per source in the sidebar. Default: 3. */
  slimLimits?: {
    ownedLimit?: number;
    builtinLimit?: number;
    sharedLimit?: number;
  };
  /** Whether to automatically upgrade to core depth when the picker opens. Default: false. */
  autoUpgradeToCore?: boolean;
}

// ── Return type ───────────────────────────────────────────────────────────────

export interface AgentConsumerReturn {
  // ── Data ────────────────────────────────────────────────────────────────────
  owned: AgentRecord[];
  builtins: AgentRecord[];
  shared: AgentRecord[];

  // ── Status ───────────────────────────────────────────────────────────────────
  isLoading: boolean;
  ownedHasMore: boolean;
  sharedHasMore: boolean;

  // ── Filter state (from promptConsumersSlice) ──────────────────────────────
  tab: PromptConsumerState["tab"];
  sortBy: PromptConsumerState["sortBy"];
  searchTerm: PromptConsumerState["searchTerm"];
  includedCats: PromptConsumerState["includedCats"];
  includedTags: PromptConsumerState["includedTags"];
  favFilter: PromptConsumerState["favFilter"];
  archFilter: PromptConsumerState["archFilter"];
  favoritesFirst: PromptConsumerState["favoritesFirst"];
  hasActiveFilters: boolean;
  isSearching: boolean;

  // ── Setters ───────────────────────────────────────────────────────────────
  setSearchTerm: (v: string) => void;
  setSortBy: (v: PromptSortOption) => void;
  setTab: (v: PromptTab) => void;
  setFavFilter: (v: FavFilter) => void;
  setArchFilter: (v: ArchFilter) => void;
  setIncludedCats: (v: string[]) => void;
  setIncludedTags: (v: string[]) => void;
  setFavoritesFirst: (v: boolean) => void;
  setFilter: (
    patch: Partial<Omit<PromptConsumerState, "listPage" | "sharedPage">>,
  ) => void;
  resetFilters: () => void;

  // ── Pagination ────────────────────────────────────────────────────────────
  loadMoreOwned: () => void;
  loadMoreShared: () => void;

  // ── Agent selection ───────────────────────────────────────────────────────
  /**
   * Fetch operational data for an agent (if not already cached) then call onSelect.
   * Use this when the user clicks an agent in the picker.
   */
  selectAgent: (
    id: string,
    source: AgentSource,
    onSelect: (agent: AgentRecord) => void,
  ) => Promise<void>;

  /** Force a full refresh of all sources. */
  refresh: () => void;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Bind a component to the agent cache system.
 *
 * @param consumerId    - Stable string identifier (e.g. "agent-picker", "chat-sidebar")
 * @param options       - Optional configuration
 */
export function useAgentConsumer(
  consumerId: string,
  options: UseAgentConsumerOptions = {},
): AgentConsumerReturn {
  const {
    ephemeral = false,
    mode = "filtered",
    slimLimits = {},
    autoUpgradeToCore = false,
  } = options;

  const dispatch = useAppDispatch();

  // ── Registration ─────────────────────────────────────────────────────────

  useEffect(() => {
    dispatch(registerConsumer(consumerId));
    return () => {
      if (ephemeral) dispatch(unregisterConsumer(consumerId));
    };
  }, [dispatch, consumerId, ephemeral]);

  // Bootstrap (Tier 1) and tab-visibility refresh are handled by useAgentBootstrap,
  // which is called once from ChatPanelContent. No duplicate fetches here.

  // ── Auto core-depth upgrade ───────────────────────────────────────────────

  // Select only the raw ID arrays — avoids creating new object references each render
  const rawOwnedIds = useAppSelector(
    (state) => state.agentCache?.ownedIds ?? EMPTY_ARRAY,
  );
  const rawBuiltinIds = useAppSelector(
    (state) => state.agentCache?.builtinIds ?? EMPTY_ARRAY,
  );
  const rawSharedIds = useAppSelector(
    (state) => state.agentCache?.sharedIds ?? EMPTY_ARRAY,
  );

  useEffect(() => {
    if (!autoUpgradeToCore) return;
    const allIds = [
      ...rawOwnedIds.map((id) => ({ id, source: "prompts" as AgentSource })),
      ...rawBuiltinIds.map((id) => ({ id, source: "builtins" as AgentSource })),
      ...rawSharedIds.map((id) => ({ id, source: "shared" as AgentSource })),
    ];
    if (allIds.length > 0) {
      dispatch(fetchAgentCoreBatch({ agents: allIds }));
    }
  }, [
    dispatch,
    autoUpgradeToCore,
    rawOwnedIds.length,
    rawBuiltinIds.length,
    rawSharedIds.length,
  ]);

  // ── Memoized selectors (created once per consumerId) ─────────────────────

  const selectFiltered = useMemo(() => {
    if (mode === "slim") {
      return {
        slim: makeSelectAgentSlimList(consumerId, slimLimits),
        owned: null as null,
        builtins: null as null,
        shared: null as null,
      };
    }
    return {
      slim: null as null,
      owned: makeSelectFilteredOwnedAgents(consumerId),
      builtins: makeSelectFilteredBuiltinAgents(consumerId),
      shared: makeSelectFilteredSharedAgents(consumerId),
    };
  }, [consumerId, mode]);

  const selectHasActiveFilters = useMemo(
    () => makeSelectAgentHasActiveFilters(consumerId),
    [consumerId],
  );

  // ── Redux state ───────────────────────────────────────────────────────────

  const consumer = useAppSelector((state) => selectConsumer(state, consumerId));
  const fetchStatus = useAppSelector(selectAgentFetchStatus);
  const ownedHasMore = useAppSelector(selectOwnedHasMore);
  const sharedHasMore = useAppSelector(selectSharedHasMore);
  const ownedCursor = useAppSelector(selectOwnedCursor);
  const hasActiveFilters = useAppSelector(selectHasActiveFilters);

  const slimData = useAppSelector(selectFiltered.slim ?? SELECT_NULL);
  const ownedFiltered = useAppSelector(
    selectFiltered.owned ?? SELECT_EMPTY_ARRAY,
  );
  const builtinsFiltered = useAppSelector(
    selectFiltered.builtins ?? SELECT_EMPTY_ARRAY,
  );
  const sharedFiltered = useAppSelector(
    selectFiltered.shared ?? SELECT_EMPTY_ARRAY,
  );

  // Final data arrays
  const owned =
    mode === "slim" ? (slimData?.owned ?? EMPTY_ARRAY) : ownedFiltered;
  const builtins =
    mode === "slim" ? (slimData?.builtins ?? EMPTY_ARRAY) : builtinsFiltered;
  const shared =
    mode === "slim" ? (slimData?.shared ?? EMPTY_ARRAY) : sharedFiltered;

  const isLoading =
    fetchStatus.owned === "loading" ||
    fetchStatus.builtins === "loading" ||
    fetchStatus.shared === "loading";

  // ── Setters ───────────────────────────────────────────────────────────────

  const setFilter = useCallback(
    (patch: Partial<Omit<PromptConsumerState, "listPage" | "sharedPage">>) => {
      dispatch(setConsumerFilter({ consumerId, patch }));
    },
    [dispatch, consumerId],
  );

  const setSearchTerm = useCallback(
    (v: string) => setFilter({ searchTerm: v }),
    [setFilter],
  );
  const setSortBy = useCallback(
    (v: PromptSortOption) => setFilter({ sortBy: v }),
    [setFilter],
  );
  const setTab = useCallback(
    (v: PromptTab) => setFilter({ tab: v }),
    [setFilter],
  );
  const setFavFilter = useCallback(
    (v: FavFilter) => setFilter({ favFilter: v }),
    [setFilter],
  );
  const setArchFilter = useCallback(
    (v: ArchFilter) => setFilter({ archFilter: v }),
    [setFilter],
  );
  const setIncludedCats = useCallback(
    (v: string[]) => setFilter({ includedCats: v }),
    [setFilter],
  );
  const setIncludedTags = useCallback(
    (v: string[]) => setFilter({ includedTags: v }),
    [setFilter],
  );
  const setFavoritesFirst = useCallback(
    (v: boolean) => setFilter({ favoritesFirst: v }),
    [setFilter],
  );

  const resetFilters = useCallback(
    () => dispatch(resetConsumerFilters(consumerId)),
    [dispatch, consumerId],
  );

  // ── Pagination ────────────────────────────────────────────────────────────

  const loadMoreOwned = useCallback(() => {
    if (!ownedHasMore) return;
    dispatch(fetchAgentSlimList({ source: "owned", cursor: ownedCursor }));
    dispatch(
      setConsumerPage({
        consumerId,
        which: "list",
        page: consumer.listPage + 1,
      }),
    );
  }, [dispatch, consumerId, ownedHasMore, ownedCursor, consumer.listPage]);

  const loadMoreShared = useCallback(() => {
    if (!sharedHasMore) return;
    dispatch(fetchAgentSlimList({ source: "shared" }));
    dispatch(
      setConsumerPage({
        consumerId,
        which: "shared",
        page: consumer.sharedPage + 1,
      }),
    );
  }, [dispatch, consumerId, sharedHasMore, consumer.sharedPage]);

  // ── Agent selection ───────────────────────────────────────────────────────

  const selectAgent = useCallback(
    async (
      id: string,
      source: AgentSource,
      onSelect: (agent: AgentRecord) => void,
    ) => {
      const result = await dispatch(
        fetchAgentOperational({ id, source }),
      ).unwrap();
      if (result) onSelect(result);
    },
    [dispatch],
  );

  // ── Refresh ───────────────────────────────────────────────────────────────

  const refresh = useCallback(() => {
    dispatch(refreshAgents());
  }, [dispatch]);

  // ── Return ────────────────────────────────────────────────────────────────

  return {
    owned,
    builtins,
    shared,

    isLoading,
    ownedHasMore,
    sharedHasMore,

    tab: consumer.tab ?? DEFAULT_CONSUMER_STATE.tab,
    sortBy: consumer.sortBy ?? DEFAULT_CONSUMER_STATE.sortBy,
    searchTerm: consumer.searchTerm ?? DEFAULT_CONSUMER_STATE.searchTerm,
    includedCats: consumer.includedCats ?? DEFAULT_CONSUMER_STATE.includedCats,
    includedTags: consumer.includedTags ?? DEFAULT_CONSUMER_STATE.includedTags,
    favFilter: consumer.favFilter ?? DEFAULT_CONSUMER_STATE.favFilter,
    archFilter: consumer.archFilter ?? DEFAULT_CONSUMER_STATE.archFilter,
    favoritesFirst:
      consumer.favoritesFirst ?? DEFAULT_CONSUMER_STATE.favoritesFirst,

    hasActiveFilters,
    isSearching: (consumer.searchTerm ?? "").length > 0,

    setSearchTerm,
    setSortBy,
    setTab,
    setFavFilter,
    setArchFilter,
    setIncludedCats,
    setIncludedTags,
    setFavoritesFirst,
    setFilter,
    resetFilters,

    loadMoreOwned,
    loadMoreShared,

    selectAgent,
    refresh,
  };
}
