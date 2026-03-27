'use client';
// features/prompts/hooks/usePromptConsumer.ts
//
// Single hook that wires a component to its per-consumer Redux prompt state.
//
// Usage:
//   const consumer = usePromptConsumer("prompts-main");
//   // Read state:
//   consumer.searchTerm, consumer.sortBy, consumer.tab, ...
//   // Write state:
//   consumer.setSearchTerm("foo");
//   consumer.setConsumerFilter({ sortBy: "name-asc", includedCats: ["AI"] });
//   consumer.resetFilters();
//
// The consumer is registered automatically on first render and is never
// unregistered (page-level consumers are persistent). If you want ephemeral
// consumers (modals, pickers) pass `ephemeral: true` to have the state cleaned
// up on unmount.

import { useEffect, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import {
    registerConsumer,
    unregisterConsumer,
    setConsumerFilter,
    setConsumerPage,
    resetConsumerFilters,
    selectConsumer,
    DEFAULT_CONSUMER_STATE,
    NONE_SENTINEL,
} from '@/lib/redux/slices/promptConsumersSlice';
import type {
    PromptConsumerState,
    PromptSortOption,
    PromptTab,
    FavFilter,
    ArchFilter,
} from '@/lib/redux/slices/promptConsumersSlice';
import { makeSelectConsumerHasActiveFilters } from '@/lib/redux/selectors/promptSelectors';

// Re-export types and the sentinel so consumers only need to import from here
export type { PromptSortOption, PromptTab, FavFilter, ArchFilter };
export { NONE_SENTINEL };

export interface UsePromptConsumerOptions {
    /** If true, the consumer's state is cleared from Redux when the component unmounts. */
    ephemeral?: boolean;
}

export interface PromptConsumerActions {
    // ── Current state ──────────────────────────────────────────────────────────
    tab:            PromptConsumerState['tab'];
    sortBy:         PromptConsumerState['sortBy'];
    searchTerm:     PromptConsumerState['searchTerm'];
    includedCats:   PromptConsumerState['includedCats'];
    includedTags:   PromptConsumerState['includedTags'];
    favFilter:      PromptConsumerState['favFilter'];
    archFilter:     PromptConsumerState['archFilter'];
    favoritesFirst: PromptConsumerState['favoritesFirst'];
    listPage:       PromptConsumerState['listPage'];
    sharedPage:     PromptConsumerState['sharedPage'];

    // ── Derived flags ──────────────────────────────────────────────────────────
    hasActiveFilters: boolean;
    isSearching:      boolean;

    // ── Individual setters ─────────────────────────────────────────────────────
    setTab:            (v: PromptTab)         => void;
    setSortBy:         (v: PromptSortOption)  => void;
    setSearchTerm:     (v: string)            => void;
    setIncludedCats:   (v: string[])          => void;
    setIncludedTags:   (v: string[])          => void;
    setFavFilter:      (v: FavFilter)         => void;
    setArchFilter:     (v: ArchFilter)        => void;
    setFavoritesFirst: (v: boolean)           => void;

    /** Batch-update multiple filter fields at once (more efficient than calling setters individually). */
    setFilter: (patch: Partial<Omit<PromptConsumerState, 'listPage' | 'sharedPage'>>) => void;

    // ── Pagination ─────────────────────────────────────────────────────────────
    setListPage:   (page: number) => void;
    setSharedPage: (page: number) => void;

    // ── Reset ──────────────────────────────────────────────────────────────────
    resetFilters: () => void;
}

/**
 * Bind a component to a named prompt consumer.
 *
 * @param consumerId - Stable string identifier for this UI (e.g. "prompts-main", "sidebar-picker")
 * @param options    - Optional: pass `{ ephemeral: true }` to clean up state on unmount
 */
export function usePromptConsumer(
    consumerId: string,
    options: UsePromptConsumerOptions = {}
): PromptConsumerActions {
    const { ephemeral = false } = options;
    const dispatch = useAppDispatch();

    // Register on mount
    useEffect(() => {
        dispatch(registerConsumer(consumerId));
        return () => {
            if (ephemeral) dispatch(unregisterConsumer(consumerId));
        };
    }, [dispatch, consumerId, ephemeral]);

    // Read consumer state
    const consumer = useAppSelector((state) => selectConsumer(state, consumerId));

    // Memoized "has active filters" selector
    const selectHasActiveFilters = useMemo(
        () => makeSelectConsumerHasActiveFilters(consumerId),
        [consumerId]
    );
    const hasActiveFilters = useAppSelector(selectHasActiveFilters);

    // ── Setters ───────────────────────────────────────────────────────────────

    const setFilter = useCallback(
        (patch: Partial<Omit<PromptConsumerState, 'listPage' | 'sharedPage'>>) => {
            dispatch(setConsumerFilter({ consumerId, patch }));
        },
        [dispatch, consumerId]
    );

    const setTab = useCallback(
        (v: PromptTab) => setFilter({ tab: v }),
        [setFilter]
    );

    const setSortBy = useCallback(
        (v: PromptSortOption) => setFilter({ sortBy: v }),
        [setFilter]
    );

    const setSearchTerm = useCallback(
        (v: string) => setFilter({ searchTerm: v }),
        [setFilter]
    );

    const setIncludedCats = useCallback(
        (v: string[]) => setFilter({ includedCats: v }),
        [setFilter]
    );

    const setIncludedTags = useCallback(
        (v: string[]) => setFilter({ includedTags: v }),
        [setFilter]
    );

    const setFavFilter = useCallback(
        (v: FavFilter) => setFilter({ favFilter: v }),
        [setFilter]
    );

    const setArchFilter = useCallback(
        (v: ArchFilter) => setFilter({ archFilter: v }),
        [setFilter]
    );

    const setFavoritesFirst = useCallback(
        (v: boolean) => setFilter({ favoritesFirst: v }),
        [setFilter]
    );

    const setListPage = useCallback(
        (page: number) => dispatch(setConsumerPage({ consumerId, which: 'list', page })),
        [dispatch, consumerId]
    );

    const setSharedPage = useCallback(
        (page: number) => dispatch(setConsumerPage({ consumerId, which: 'shared', page })),
        [dispatch, consumerId]
    );

    const resetFilters = useCallback(
        () => dispatch(resetConsumerFilters(consumerId)),
        [dispatch, consumerId]
    );

    return {
        // State
        tab:            consumer.tab            ?? DEFAULT_CONSUMER_STATE.tab,
        sortBy:         consumer.sortBy         ?? DEFAULT_CONSUMER_STATE.sortBy,
        searchTerm:     consumer.searchTerm     ?? DEFAULT_CONSUMER_STATE.searchTerm,
        includedCats:   consumer.includedCats   ?? DEFAULT_CONSUMER_STATE.includedCats,
        includedTags:   consumer.includedTags   ?? DEFAULT_CONSUMER_STATE.includedTags,
        favFilter:      consumer.favFilter      ?? DEFAULT_CONSUMER_STATE.favFilter,
        archFilter:     consumer.archFilter     ?? DEFAULT_CONSUMER_STATE.archFilter,
        favoritesFirst: consumer.favoritesFirst ?? DEFAULT_CONSUMER_STATE.favoritesFirst,
        listPage:       consumer.listPage       ?? DEFAULT_CONSUMER_STATE.listPage,
        sharedPage:     consumer.sharedPage     ?? DEFAULT_CONSUMER_STATE.sharedPage,

        // Derived
        hasActiveFilters,
        isSearching: (consumer.searchTerm ?? '').length > 0,

        // Setters
        setTab,
        setSortBy,
        setSearchTerm,
        setIncludedCats,
        setIncludedTags,
        setFavFilter,
        setArchFilter,
        setFavoritesFirst,
        setFilter,

        // Pagination
        setListPage,
        setSharedPage,

        // Reset
        resetFilters,
    };
}
