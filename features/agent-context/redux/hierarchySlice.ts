"use client";

// features/context/redux/hierarchySlice.ts
//
// Stores the user's org/project/task tree fetched from Supabase RPCs.
// Workspaces have been removed from the schema.
//
// Two RPCs:
//   get_user_nav_tree        — lightweight, no tasks  → always loaded on app boot
//   get_user_full_context    — includes open tasks     → loaded on demand

import { createSlice, createSelector, PayloadAction } from "@reduxjs/toolkit";

// ─── RPC response types ────────────────────────────────────────────────────

export interface NavProject {
  id: string;
  name: string;
  slug: string | null;
  is_personal: boolean;
}

export interface NavTask {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  due_date: string | null;
  assignee_id: string | null;
}

export interface NavProjectWithTasks extends NavProject {
  open_task_count: number;
  open_tasks: NavTask[];
}

export interface NavOrganization {
  id: string;
  name: string;
  slug: string;
  is_personal: boolean;
  role: string;
  projects: NavProject[];
}

export interface NavOrganizationWithTasks {
  id: string;
  name: string;
  slug: string;
  is_personal: boolean;
  role: string;
  projects: NavProjectWithTasks[];
}

export interface NavTreeResponse {
  organizations: NavOrganization[];
}

export interface FullContextResponse {
  organizations: NavOrganizationWithTasks[];
}

// ─── Slice state ───────────────────────────────────────────────────────────

type FetchStatus = "idle" | "loading" | "success" | "error";

export interface HierarchyState {
  /** Lightweight nav tree (no tasks) */
  navTree: NavTreeResponse | null;
  navTreeStatus: FetchStatus;
  navTreeError: string | null;

  /** Full context including open tasks */
  fullContext: FullContextResponse | null;
  fullContextStatus: FetchStatus;
  fullContextError: string | null;
}

const initialState: HierarchyState = {
  navTree: null,
  navTreeStatus: "idle",
  navTreeError: null,

  fullContext: null,
  fullContextStatus: "idle",
  fullContextError: null,
};

// ─── Slice ─────────────────────────────────────────────────────────────────

const hierarchySlice = createSlice({
  name: "hierarchy",
  initialState,
  reducers: {
    navTreeFetchStarted(state) {
      state.navTreeStatus = "loading";
      state.navTreeError = null;
    },
    navTreeFetchSucceeded(state, action: PayloadAction<NavTreeResponse>) {
      state.navTree = action.payload;
      state.navTreeStatus = "success";
      state.navTreeError = null;
    },
    navTreeFetchFailed(state, action: PayloadAction<string>) {
      state.navTreeStatus = "error";
      state.navTreeError = action.payload;
    },

    fullContextFetchStarted(state) {
      state.fullContextStatus = "loading";
      state.fullContextError = null;
    },
    fullContextFetchSucceeded(
      state,
      action: PayloadAction<FullContextResponse>,
    ) {
      state.fullContext = action.payload;
      state.fullContextStatus = "success";
      state.fullContextError = null;
    },
    fullContextFetchFailed(state, action: PayloadAction<string>) {
      state.fullContextStatus = "error";
      state.fullContextError = action.payload;
    },

    /** Force a re-fetch on next request (e.g. after creating/deleting entities) */
    invalidateNavTree(state) {
      state.navTreeStatus = "idle";
      state.navTree = null;
    },
    invalidateFullContext(state) {
      state.fullContextStatus = "idle";
      state.fullContext = null;
    },
    invalidateAll(state) {
      state.navTreeStatus = "idle";
      state.navTree = null;
      state.fullContextStatus = "idle";
      state.fullContext = null;
    },
  },
});

export const {
  navTreeFetchStarted,
  navTreeFetchSucceeded,
  navTreeFetchFailed,
  fullContextFetchStarted,
  fullContextFetchSucceeded,
  fullContextFetchFailed,
  invalidateNavTree,
  invalidateFullContext,
  invalidateAll,
} = hierarchySlice.actions;

export default hierarchySlice.reducer;

// ─── Selectors ──────────────────────────────────────────────────────────────

type StateWithHierarchy = { hierarchy: HierarchyState };

export const selectNavTree = (s: StateWithHierarchy) => s.hierarchy.navTree;
export const selectNavTreeStatus = (s: StateWithHierarchy) =>
  s.hierarchy.navTreeStatus;
export const selectNavTreeError = (s: StateWithHierarchy) =>
  s.hierarchy.navTreeError;

export const selectFullContext = (s: StateWithHierarchy) =>
  s.hierarchy.fullContext;
export const selectFullContextStatus = (s: StateWithHierarchy) =>
  s.hierarchy.fullContextStatus;
export const selectFullContextError = (s: StateWithHierarchy) =>
  s.hierarchy.fullContextError;

/** All organizations from the nav tree (no tasks). */
export const selectNavOrganizations = (s: StateWithHierarchy) =>
  s.hierarchy.navTree?.organizations;

/** All organizations from full context (with tasks). */
export const selectFullContextOrganizations = (s: StateWithHierarchy) =>
  s.hierarchy.fullContext?.organizations;

// ─── Flat-list helpers ────────────────────────────────────────────────────

const EMPTY_PROJECTS: (NavProject & { org_id: string })[] = [];

/** Extract all projects across all orgs as a flat list. */
function flattenProjects(
  orgs: NavOrganization[],
): (NavProject & { org_id: string })[] {
  const result: (NavProject & { org_id: string })[] = [];
  for (const org of orgs) {
    for (const p of org.projects) {
      result.push({ ...p, org_id: org.id });
    }
  }
  return result;
}

/** Flat list of all projects across all orgs. Memoized. */
export const selectFlatProjects = createSelector(
  [selectNavOrganizations],
  (orgs) => (orgs ? flattenProjects(orgs) : EMPTY_PROJECTS),
);

/** Projects for a given org. */
export const selectProjectsForOrg =
  (orgId: string | null) =>
  (s: StateWithHierarchy): (NavProject & { org_id: string })[] => {
    if (!orgId) return EMPTY_PROJECTS;
    return selectFlatProjects(s).filter((p) => p.org_id === orgId);
  };
