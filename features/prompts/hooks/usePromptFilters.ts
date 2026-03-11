// features/prompts/hooks/usePromptFilters.ts
//
// URL-parameter–backed filter state for the prompts UI.
//
// Values are stored in the URL so they are:
//   - Bookmarkable — save a filtered view as a browser bookmark
//   - Shareable    — paste the URL to get the same view
//   - History-aware — browser Back/Forward restores the filter state
//   - Deep-linkable — any link can pre-apply filters
//
// Defaults are never written to the URL to keep links clean.
//
// Filter logic:
//   - Tags / Categories: EXCLUSION model — all shown by default, uncheck to hide
//     xcats / xtags store the excluded values (comma-separated)
//     NONE_SENTINEL in exclusions means "hide uncategorized / untagged"
//   - Favorites / Archived: single-choice radio
//   - favoritesFirst: secondary sort that pins favorites to the top

"use client";

import { useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PromptSortOption = "updated-desc" | "created-desc" | "name-asc" | "name-desc" | "category-asc";
export type PromptTab        = "mine" | "shared" | "all";

/** Radio for favorites dimension. "all" = default, omitted from URL. */
export type FavFilter = "all" | "yes" | "no";

/** Radio for archived dimension. "active" = default, omitted from URL. */
export type ArchFilter = "active" | "archived" | "both";

/** Sentinel value in exclusion lists meaning "has none" (no category / no tags). */
export const NONE_SENTINEL = "__none__";

const DEFAULT_TAB:   PromptTab        = "mine";
const DEFAULT_SORT:  PromptSortOption = "updated-desc";
const DEFAULT_FAV:   FavFilter        = "all";
const DEFAULT_ARCH:  ArchFilter       = "active";

export interface PromptFilters {
    tab:          PromptTab;
    sortBy:       PromptSortOption;
    searchTerm:   string;

    /**
     * Excluded categories. Empty = no exclusions (show all).
     * NONE_SENTINEL = hide uncategorized prompts.
     */
    excludedCats: string[];
    /**
     * Excluded tags. Empty = no exclusions (show all).
     * NONE_SENTINEL = hide untagged prompts.
     */
    excludedTags: string[];

    /** "all" | "yes" (favorites only) | "no" (non-favorites only) */
    favFilter:    FavFilter;
    /** "active" (default) | "archived" | "both" */
    archFilter:   ArchFilter;
    /** When true, favorites are pinned to the top within the chosen sort order. */
    favoritesFirst: boolean;

    setTab:           (tab: PromptTab)         => void;
    setSortBy:        (sort: PromptSortOption) => void;
    setSearchTerm:    (q: string)              => void;
    setExcludedCats:  (cats: string[])         => void;
    setExcludedTags:  (tags: string[])         => void;
    setFavFilter:     (v: FavFilter)           => void;
    setArchFilter:    (v: ArchFilter)          => void;
    setFavoritesFirst:(v: boolean)             => void;

    resetFilters:    () => void;
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
    const tab        = (searchParams.get("tab")  as PromptTab        | null) ?? DEFAULT_TAB;
    const sortBy     = (searchParams.get("sort") as PromptSortOption | null) ?? DEFAULT_SORT;
    const searchTerm = searchParams.get("q") ?? "";

    const xcatsRaw    = searchParams.get("xcats") ?? "";
    const excludedCats = xcatsRaw ? xcatsRaw.split(",").filter(Boolean) : [];

    const xtagsRaw    = searchParams.get("xtags") ?? "";
    const excludedTags = xtagsRaw ? xtagsRaw.split(",").filter(Boolean) : [];

    const favRaw  = searchParams.get("fav");
    const favFilter: FavFilter =
        favRaw === "yes" ? "yes"
        : favRaw === "no" ? "no"
        : DEFAULT_FAV;

    const archRaw = searchParams.get("arch");
    const archFilter: ArchFilter =
        archRaw === "archived" ? "archived"
        : archRaw === "both"   ? "both"
        : DEFAULT_ARCH;

    // favoritesFirst: default true; only written to URL as "false" when disabled
    const favoritesFirst = searchParams.get("fav-first") !== "false";

    // ── Write ─────────────────────────────────────────────────────────────────
    const setParam = useCallback(
        (key: string, value: string, defaultValue: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value === "" || value === defaultValue) {
                params.delete(key);
            } else {
                params.set(key, value);
            }
            const qs = params.toString();
            router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        },
        [searchParams, pathname, router],
    );

    const setTab       = useCallback((v: PromptTab)         => setParam("tab",  v, DEFAULT_TAB),  [setParam]);
    const setSortBy    = useCallback((v: PromptSortOption)  => setParam("sort", v, DEFAULT_SORT), [setParam]);
    const setSearchTerm = useCallback((v: string)           => setParam("q",    v, ""),           [setParam]);
    const setFavFilter  = useCallback((v: FavFilter)        => setParam("fav",  v, DEFAULT_FAV),  [setParam]);
    const setArchFilter = useCallback((v: ArchFilter)       => setParam("arch", v, DEFAULT_ARCH), [setParam]);

    const setFavoritesFirst = useCallback((v: boolean) =>
        setParam("fav-first", v ? "" : "false", ""), [setParam]);

    const setExcludedCats = useCallback((v: string[]) =>
        setParam("xcats", v.join(","), ""), [setParam]);

    const setExcludedTags = useCallback((v: string[]) =>
        setParam("xtags", v.join(","), ""), [setParam]);

    const resetFilters = useCallback(() => {
        router.replace(pathname, { scroll: false });
    }, [router, pathname]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const hasActiveFilters =
        tab !== DEFAULT_TAB ||
        sortBy !== DEFAULT_SORT ||
        searchTerm !== "" ||
        excludedCats.length > 0 ||
        excludedTags.length > 0 ||
        favFilter !== DEFAULT_FAV ||
        archFilter !== DEFAULT_ARCH ||
        !favoritesFirst;

    return {
        tab,
        sortBy,
        searchTerm,
        excludedCats,
        excludedTags,
        favFilter,
        archFilter,
        favoritesFirst,
        setTab,
        setSortBy,
        setSearchTerm,
        setExcludedCats,
        setExcludedTags,
        setFavFilter,
        setArchFilter,
        setFavoritesFirst,
        resetFilters,
        hasActiveFilters,
        isSearching: searchTerm.length > 0,
    };
}
