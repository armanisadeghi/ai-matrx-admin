"use client";

// usePagedOrganizations — THE ONE way a picker lists the person's organizations (bounded
// organizations, 2026-10-16). The list is the shared first page (`useUserOrganizations`, seeded at
// boot); while it is the whole list a query filters it locally, and once it is a PAGE (`hasMore`)
// every query goes to the server (`iam.my_organizations_page` p_search, debounced) and "more"
// pages the current answer. Nothing here ever reads all of her organizations.

import { useEffect, useRef, useState } from "react";
import { useUserOrganizations } from "@/features/organizations/hooks";
import { getUserOrganizationsPage } from "@/features/organizations/service";
import type { OrganizationWithRole } from "@/features/organizations/types";
import type { OrganizationArchiveFilter } from "@/features/organizations/service/organizationArchive";
import { DEFAULT_ARCHIVE_FILTER } from "@ai-matrx/design-system/archive-filter";
import type { OrganizationPickerMore } from "@ai-matrx/design-system";

const SEARCH_DEBOUNCE_MS = 200;

interface SearchState {
  query: string;
  organizations: OrganizationWithRole[];
  total: number;
  hasMore: boolean;
  nextCursor: string | null;
  loading: boolean;
  error: string | null;
}

export function matchesOrganization(org: Pick<OrganizationWithRole, "name" | "slug"> & { abbreviation?: string | null }, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    org.name.toLowerCase().includes(q) ||
    (org.slug ?? "").toLowerCase().includes(q) ||
    (org.abbreviation ?? "").toLowerCase().includes(q)
  );
}

export function usePagedOrganizations(archiveFilter: OrganizationArchiveFilter = DEFAULT_ARCHIVE_FILTER) {
  const base = useUserOrganizations(archiveFilter);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<SearchState | null>(null);
  const asked = useRef(0);

  const trimmed = query.trim();
  const serverSearch = base.hasMore && trimmed.length > 0;

  useEffect(() => {
    if (!serverSearch) return;
    const ticket = ++asked.current;
    const timer = setTimeout(() => {
      setSearch((prev) => ({
        query: trimmed,
        organizations: prev?.query === trimmed ? prev.organizations : [],
        total: prev?.query === trimmed ? prev.total : 0,
        hasMore: false,
        nextCursor: null,
        loading: true,
        error: null,
      }));
      getUserOrganizationsPage({ search: trimmed, archiveFilter }).then(
        (page) => {
          if (asked.current !== ticket) return;
          setSearch({ query: trimmed, ...page, loading: false, error: null });
        },
        (err: unknown) => {
          if (asked.current !== ticket) return;
          setSearch({
            query: trimmed,
            organizations: [],
            total: 0,
            hasMore: false,
            nextCursor: null,
            loading: false,
            error: err instanceof Error ? err.message : "Search failed",
          });
        },
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [serverSearch, trimmed, archiveFilter]);

  const loadMoreSearch = () => {
    const current = search;
    if (!current || !current.hasMore || !current.nextCursor || current.loading) return;
    const ticket = asked.current;
    setSearch({ ...current, loading: true });
    getUserOrganizationsPage({ search: current.query, cursor: current.nextCursor, archiveFilter }).then(
      (page) => {
        if (asked.current !== ticket) return;
        const seen = new Set(current.organizations.map((o) => o.id));
        setSearch({
          ...current,
          organizations: [...current.organizations, ...page.organizations.filter((o) => !seen.has(o.id))],
          total: page.total,
          hasMore: page.hasMore,
          nextCursor: page.nextCursor,
          loading: false,
        });
      },
      (err: unknown) => {
        if (asked.current !== ticket) return;
        setSearch({ ...current, loading: false, error: err instanceof Error ? err.message : "Search failed" });
      },
    );
  };

  const showingSearch = serverSearch && search?.query === trimmed;
  const organizations = serverSearch
    ? showingSearch
      ? search.organizations
      : []
    : trimmed
      ? base.organizations.filter((org) => matchesOrganization(org, trimmed))
      : base.organizations;

  return {
    /** What to draw for the current query: the server's matches, or the (filtered) first pages. */
    organizations,
    /** The whole first page list, whatever the query (the active organization's row, labels). */
    loadedOrganizations: base.organizations,
    query,
    setQuery,
    /** The list is a page of a longer one: hosts must search server-side (they do, through this). */
    isPartial: base.hasMore,
    total: serverSearch ? (showingSearch ? search.total : null) : base.total,
    hasMore: serverSearch ? Boolean(showingSearch && search.hasMore) : base.hasMore && !trimmed,
    loadingMore: serverSearch ? Boolean(search?.loading) : base.loadingMore,
    loadMore: serverSearch ? loadMoreSearch : base.loadMore,
    loading: base.loading,
    error: base.error ?? (serverSearch ? (search?.error ?? null) : null),
    refresh: base.refresh,
  };
}

/** The paged half of `OrganizationPicker`'s props: `more` only while the list is a page. */
export function pagedPickerProps(paged: ReturnType<typeof usePagedOrganizations>): { more?: OrganizationPickerMore } {
  if (!paged.isPartial) return {};
  return {
    more: {
      onQueryChange: paged.setQuery,
      hasMore: paged.hasMore,
      onLoadMore: paged.loadMore,
      loadingMore: paged.loadingMore,
      ...(paged.total !== null ? { total: paged.total } : {}),
    },
  };
}
