// features/scopes/hooks/useScopeTree.ts
//
// Public hook for reading the scope tree. Most consumers should reach for
// this rather than wiring `useSelector(makeSelectOrganizationsList)` by
// hand. Returns a stable shape — refreshes via `refresh()` follow the
// no-refetch policy (only fires if you ask).

"use client";

import { useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectOrganizationsList,
  selectTreeError,
  selectTreeFetchedAt,
  selectTreeStatus,
} from "@/features/scopes/redux/selectors/tree";
import { ensureScopeTree } from "@/features/scopes/redux/thunks/ensureScopeTree";
import type { OrgNode } from "@/features/scopes/types";

export interface UseScopeTreeReturn {
  organizations: OrgNode[];
  status: ReturnType<typeof selectTreeStatus>;
  error: string | null;
  fetchedAt: number | null;
  refresh: () => Promise<void>;
}

const NO_ORGANIZATIONS: OrgNode[] = [];
const NOT_ENGAGED_SELECTOR_VALUE = {
  organizations: NO_ORGANIZATIONS,
  status: "idle" as const,
  error: null,
  fetchedAt: null,
};
const readNothing = () => null;
const readNoOrganizations = () => NO_ORGANIZATIONS;
const readIdle = () => NOT_ENGAGED_SELECTOR_VALUE.status;

/**
 * `enabled: false` is the explicit "not needed yet" — a closed menu, an unopened panel. The hook
 * then reads a static empty view and never touches `state.scopesTree`, so the store's demand
 * enhancer (scopeTreeDemand.ts) sees no read and the tree does not load. Default true.
 */
export function useScopeTree({ enabled = true }: { enabled?: boolean } = {}): UseScopeTreeReturn {
  const dispatch = useAppDispatch();
  const organizations = useAppSelector(enabled ? selectOrganizationsList : readNoOrganizations);
  const status = useAppSelector(enabled ? selectTreeStatus : readIdle);
  const error = useAppSelector(enabled ? selectTreeError : readNothing);
  const fetchedAt = useAppSelector(enabled ? selectTreeFetchedAt : readNothing);

  return useMemo(
    () => ({
      organizations,
      status,
      error,
      fetchedAt,
      refresh: () => dispatch(ensureScopeTree({ refresh: true })),
    }),
    [organizations, status, error, fetchedAt, dispatch],
  );
}
