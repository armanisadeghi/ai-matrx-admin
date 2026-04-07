"use client";

// features/context/hooks/useNavTree.ts
//
// Single hook for accessing the nav tree (org/workspace/project hierarchy).
//
// Usage:
//   const { navTree, orgs, status, isLoading } = useNavTree();
//
// On mount, dispatches `fetchNavTree()` if the tree hasn't been fetched yet.
// All components share the same Redux state — there are no duplicate fetches.

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectNavTree,
  selectNavTreeStatus,
  selectNavTreeError,
  selectNavOrganizations,
  selectFlatWorkspaces,
  selectFlatProjects,
  selectWorkspacesForOrg,
  selectProjectsForOrg,
  selectProjectsForWorkspace,
} from "@/features/context/redux/hierarchySlice";
import { fetchNavTree } from "@/features/context/redux/hierarchyThunks";

export function useNavTree() {
  const dispatch = useAppDispatch();
  const navTree = useAppSelector(selectNavTree);
  const status = useAppSelector(selectNavTreeStatus);
  const error = useAppSelector(selectNavTreeError);
  const orgs = useAppSelector(selectNavOrganizations);
  const flatWorkspaces = useAppSelector(selectFlatWorkspaces);
  const flatProjects = useAppSelector(selectFlatProjects);

  useEffect(() => {
    if (status === "idle") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatch(fetchNavTree() as any);
    }
  }, [dispatch, status]);

  return {
    navTree,
    orgs,
    flatWorkspaces,
    flatProjects,
    status,
    isLoading: status === "loading",
    isSuccess: status === "success",
    isError: status === "error",
    error,
    /** Selector helper: all workspaces for a given org */
    workspacesForOrg: (orgId: string | null) =>
      flatWorkspaces.filter((w) => w.org_id === orgId),
    /** Selector helper: all projects for a given org (includes workspace and org-level) */
    projectsForOrg: (orgId: string | null) =>
      flatProjects.filter((p) => p.org_id === orgId),
    /** Selector helper: projects for a specific workspace */
    projectsForWorkspace: (wsId: string | null) =>
      flatProjects.filter((p) => p.workspace_id === wsId),
  };
}

/**
 * Convenience — just returns the list of orgs, triggering a fetch if needed.
 * Use in org-picker dropdowns where you only need orgs.
 */
export function useNavOrganizations() {
  const { orgs, isLoading, isError } = useNavTree();
  return { orgs, isLoading, isError };
}
