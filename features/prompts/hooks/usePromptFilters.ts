// features/prompts/hooks/usePromptFilters.ts
//
// URL-parameter–backed filter state for the prompts UI.
//
// Values are stored in the URL so they are:
//   - Bookmarkable — save "shared, sorted A-Z" as a browser bookmark
//   - Shareable    — paste the URL to get the same view
//   - History-aware — browser Back/Forward restores the filter state
//   - Deep-linkable — any link can pre-apply filters
//
// Defaults are never written to the URL to keep links clean.
//   ?tab=mine   → omitted (it's the default)
//   ?sort=updated-desc → omitted
//   ?q=         → omitted
//
// Usage in any component (no provider, no prop drilling):
//   const { tab, sortBy, searchTerm, setTab, setSortBy, setSearchTerm, resetFilters } = usePromptFilters();

"use client";

import { useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PromptSortOption = "updated-desc" | "name-asc" | "name-desc";
export type PromptTab        = "mine" | "shared" | "all";

const DEFAULT_TAB:  PromptTab        = "mine";
const DEFAULT_SORT: PromptSortOption = "updated-desc";
const DEFAULT_Q    = "";

export interface PromptFilters {
    /** Active tab — "mine" | "shared" */
    tab: PromptTab;
    /** Sort order */
    sortBy: PromptSortOption;
    /** Free-text search */
    searchTerm: string;

    // Setters — write the value to the URL using router.replace (no history entry)
    setTab:        (tab: PromptTab)        => void;
    setSortBy:     (sort: PromptSortOption) => void;
    setSearchTerm: (q: string)             => void;

    /** Clears all filters back to defaults (no params in URL) */
    resetFilters: () => void;

    // Derived convenience flags
    hasActiveFilters: boolean;
    isSearching:      boolean;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePromptFilters(): PromptFilters {
    const searchParams = useSearchParams();
    const router       = useRouter();
    const pathname     = usePathname();

    // ── Read ─────────────────────────────────────────────────────────────────
    const tab    = (searchParams.get("tab")  as PromptTab        | null) ?? DEFAULT_TAB;
    const sortBy = (searchParams.get("sort") as PromptSortOption | null) ?? DEFAULT_SORT;
    const searchTerm = searchParams.get("q") ?? DEFAULT_Q;

    // ── Write ─────────────────────────────────────────────────────────────────
    /**
     * Update a single param and push the new URL without adding a history entry.
     * Passing `null` or the default value removes the param to keep URLs clean.
     */
    const setParam = useCallback(
        (key: string, value: string | null, defaultValue: string) => {
            const params = new URLSearchParams(searchParams.toString());

            if (value === null || value === "" || value === defaultValue) {
                params.delete(key);
            } else {
                params.set(key, value);
            }

            const qs      = params.toString();
            const newPath = qs ? `${pathname}?${qs}` : pathname;
            router.replace(newPath, { scroll: false });
        },
        [searchParams, pathname, router]
    );

    const setTab        = useCallback((v: PromptTab)         => setParam("tab",  v, DEFAULT_TAB),  [setParam]);
    const setSortBy     = useCallback((v: PromptSortOption)  => setParam("sort", v, DEFAULT_SORT), [setParam]);
    const setSearchTerm = useCallback((v: string)            => setParam("q",    v, DEFAULT_Q),    [setParam]);

    const resetFilters  = useCallback(() => {
        router.replace(pathname, { scroll: false });
    }, [router, pathname]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const hasActiveFilters = tab !== DEFAULT_TAB || sortBy !== DEFAULT_SORT || searchTerm !== DEFAULT_Q;
    const isSearching      = searchTerm.length > 0;

    return {
        tab,
        sortBy,
        searchTerm,
        setTab,
        setSortBy,
        setSearchTerm,
        resetFilters,
        hasActiveFilters,
        isSearching,
    };
}
