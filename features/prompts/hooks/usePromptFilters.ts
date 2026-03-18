// features/prompts/hooks/usePromptFilters.ts
//
// URL-parameter-backed filter state for the prompts UI.
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
//   - Tags / Categories: INCLUSION model — empty = show all, non-empty = show only matching
//     The special NONE_SENTINEL value means "include uncategorized / untagged"
//   - Favorites / Archived: single-choice radio
//   - favoritesFirst: secondary sort that pins favorites to the top

"use client";

import { useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export type PromptSortOption = "updated-desc" | "created-desc" | "name-asc" | "name-desc" | "category-asc";
export type PromptTab        = "mine" | "shared" | "all";
export type FavFilter = "all" | "yes" | "no";
export type ArchFilter = "active" | "archived" | "both";

/** Sentinel value meaning "has none" (no category / no tags). */
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
     * Included categories. Empty = no category filter (show all).
     * NONE_SENTINEL in the list = include uncategorized prompts.
     */
    includedCats: string[];
    /**
     * Included tags. Empty = no tag filter (show all).
     * NONE_SENTINEL in the list = include untagged prompts.
     */
    includedTags: string[];

    favFilter:    FavFilter;
    archFilter:   ArchFilter;
    favoritesFirst: boolean;

    setTab:            (tab: PromptTab)         => void;
    setSortBy:         (sort: PromptSortOption) => void;
    setSearchTerm:     (q: string)              => void;
    setIncludedCats:   (cats: string[])         => void;
    setIncludedTags:   (tags: string[])         => void;
    setFavFilter:      (v: FavFilter)           => void;
    setArchFilter:     (v: ArchFilter)          => void;
    setFavoritesFirst: (v: boolean)             => void;

    resetFilters:    () => void;
    hasActiveFilters: boolean;
    isSearching:      boolean;
}

export function usePromptFilters(): PromptFilters {
    const searchParams = useSearchParams();
    const router       = useRouter();
    const pathname     = usePathname();

    const tab        = (searchParams.get("tab")  as PromptTab        | null) ?? DEFAULT_TAB;
    const sortBy     = (searchParams.get("sort") as PromptSortOption | null) ?? DEFAULT_SORT;
    const searchTerm = searchParams.get("q") ?? "";

    const icatsRaw    = searchParams.get("icats") ?? "";
    const includedCats = icatsRaw ? icatsRaw.split(",").filter(Boolean) : [];

    const itagsRaw    = searchParams.get("itags") ?? "";
    const includedTags = itagsRaw ? itagsRaw.split(",").filter(Boolean) : [];

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

    const favoritesFirst = searchParams.get("fav-first") !== "false";

    const setParam = useCallback(
        (key: string, value: string, defaultValue: string) => {
            const params = new URLSearchParams(searchParams.toString());
            if (value === "" || value === defaultValue) {
                params.delete(key);
            } else {
                params.set(key, value);
            }
            // Clean up old exclusion params if present (migration)
            params.delete("xcats");
            params.delete("xtags");
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

    const setIncludedCats = useCallback((v: string[]) =>
        setParam("icats", v.join(","), ""), [setParam]);

    const setIncludedTags = useCallback((v: string[]) =>
        setParam("itags", v.join(","), ""), [setParam]);

    const resetFilters = useCallback(() => {
        router.replace(pathname, { scroll: false });
    }, [router, pathname]);

    const hasActiveFilters =
        tab !== DEFAULT_TAB ||
        sortBy !== DEFAULT_SORT ||
        searchTerm !== "" ||
        includedCats.length > 0 ||
        includedTags.length > 0 ||
        favFilter !== DEFAULT_FAV ||
        archFilter !== DEFAULT_ARCH ||
        !favoritesFirst;

    return {
        tab,
        sortBy,
        searchTerm,
        includedCats,
        includedTags,
        favFilter,
        archFilter,
        favoritesFirst,
        setTab,
        setSortBy,
        setSearchTerm,
        setIncludedCats,
        setIncludedTags,
        setFavFilter,
        setArchFilter,
        setFavoritesFirst,
        resetFilters,
        hasActiveFilters,
        isSearching: searchTerm.length > 0,
    };
}
