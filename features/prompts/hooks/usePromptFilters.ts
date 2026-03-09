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

export type PromptSortOption = "updated-desc" | "created-desc" | "name-asc" | "name-desc" | "category-asc";
export type PromptTab        = "mine" | "shared" | "all";

const DEFAULT_TAB:  PromptTab        = "mine";
const DEFAULT_SORT: PromptSortOption = "updated-desc";
const DEFAULT_Q    = "";

export interface PromptFilters {
    tab: PromptTab;
    sortBy: PromptSortOption;
    searchTerm: string;
    category: string;
    excludeCategory: string;
    tags: string[];
    excludeTags: string[];
    showArchived: boolean;
    favoritesOnly: boolean;

    setTab:             (tab: PromptTab)          => void;
    setSortBy:          (sort: PromptSortOption)  => void;
    setSearchTerm:      (q: string)               => void;
    setCategory:        (cat: string)             => void;
    setExcludeCategory: (cat: string)             => void;
    setTags:            (tags: string[])          => void;
    setExcludeTags:     (tags: string[])          => void;
    setShowArchived:    (show: boolean)           => void;
    setFavoritesOnly:   (fav: boolean)            => void;

    resetFilters: () => void;

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
    const tab          = (searchParams.get("tab")  as PromptTab        | null) ?? DEFAULT_TAB;
    const sortBy       = (searchParams.get("sort") as PromptSortOption | null) ?? DEFAULT_SORT;
    const searchTerm   = searchParams.get("q") ?? DEFAULT_Q;
    const category          = searchParams.get("category") ?? "";
    const excludeCategory   = searchParams.get("cat-ex") ?? "";
    const tagsRaw           = searchParams.get("tags") ?? "";
    const tags              = tagsRaw ? tagsRaw.split(",").filter(Boolean) : [];
    const excludeTagsRaw    = searchParams.get("tags-ex") ?? "";
    const excludeTags       = excludeTagsRaw ? excludeTagsRaw.split(",").filter(Boolean) : [];
    const showArchived      = searchParams.get("archived") === "true";
    const favoritesOnly     = searchParams.get("favorites") === "true";

    // ── Write ─────────────────────────────────────────────────────────────────
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

    const setTab          = useCallback((v: PromptTab)         => setParam("tab",       v, DEFAULT_TAB),  [setParam]);
    const setSortBy       = useCallback((v: PromptSortOption)  => setParam("sort",      v, DEFAULT_SORT), [setParam]);
    const setSearchTerm   = useCallback((v: string)            => setParam("q",         v, DEFAULT_Q),    [setParam]);
    const setCategory        = useCallback((v: string)  => setParam("category", v, ""),           [setParam]);
    const setExcludeCategory = useCallback((v: string)  => setParam("cat-ex",   v, ""),           [setParam]);
    const setShowArchived    = useCallback((v: boolean) => setParam("archived",  v ? "true" : "", ""), [setParam]);
    const setFavoritesOnly   = useCallback((v: boolean) => setParam("favorites", v ? "true" : "", ""), [setParam]);

    const setTags = useCallback((v: string[]) => {
        setParam("tags", v.length > 0 ? v.join(",") : "", "");
    }, [setParam]);

    const setExcludeTags = useCallback((v: string[]) => {
        setParam("tags-ex", v.length > 0 ? v.join(",") : "", "");
    }, [setParam]);

    const resetFilters  = useCallback(() => {
        router.replace(pathname, { scroll: false });
    }, [router, pathname]);

    // ── Derived ───────────────────────────────────────────────────────────────
    const hasActiveFilters =
        tab !== DEFAULT_TAB ||
        sortBy !== DEFAULT_SORT ||
        searchTerm !== DEFAULT_Q ||
        category !== "" ||
        excludeCategory !== "" ||
        tags.length > 0 ||
        excludeTags.length > 0 ||
        showArchived ||
        favoritesOnly;
    const isSearching = searchTerm.length > 0;

    return {
        tab,
        sortBy,
        searchTerm,
        category,
        excludeCategory,
        tags,
        excludeTags,
        showArchived,
        favoritesOnly,
        setTab,
        setSortBy,
        setSearchTerm,
        setCategory,
        setExcludeCategory,
        setTags,
        setExcludeTags,
        setShowArchived,
        setFavoritesOnly,
        resetFilters,
        hasActiveFilters,
        isSearching,
    };
}
