"use client";

// features/context/hooks/useNavTree.ts
//
// Single hook for accessing the nav tree (org/project hierarchy).

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectNavTree,
  selectNavTreeStatus,
  selectNavTreeError,
  selectNavOrganizations,
  selectFlatProjects,
  selectProjectsForOrg,
} from "@/features/context/redux/hierarchySlice";
import { fetchNavTree } from "@/features/context/redux/hierarchyThunks";

export function useNavTree() {
  const dispatch = useAppDispatch();
  const navTree = useAppSelector(selectNavTree);
  const status = useAppSelector(selectNavTreeStatus);
  const error = useAppSelector(selectNavTreeError);
  const orgs = useAppSelector(selectNavOrganizations);
  const flatProjects = useAppSelector(selectFlatProjects);

  useEffect(() => {
    if (status === "idle") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatch(fetchNavTree() as any);
    }
  }, [dispatch, status]);

  return {
    navTree,
    orgs: orgs ?? [],
    flatProjects,
    status,
    isLoading: status === "loading",
    isSuccess: status === "success",
    isError: status === "error",
    error,
    /** Selector helper: all projects for a given org */
    projectsForOrg: (orgId: string | null) =>
      flatProjects.filter((p) => p.org_id === orgId),
  };
}

/**
 * Convenience — just returns the list of orgs, triggering a fetch if needed.
 */
export function useNavOrganizations() {
  const { orgs, isLoading, isError } = useNavTree();
  return { orgs, isLoading, isError };
}
