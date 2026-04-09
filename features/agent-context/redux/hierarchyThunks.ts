"use client";

// features/context/redux/hierarchyThunks.ts
//
// Thunks for fetching the user hierarchy via Supabase RPCs.
// Workspace layer removed — hierarchy is now org -> project -> task.
//
// Usage:
//   dispatch(fetchNavTree())        — on sidebar mount / app boot
//   dispatch(fetchFullContext())    — on dashboard / task-board pages
//   dispatch(invalidateAndRefetchNavTree())  — after CRUD mutations

import { supabase } from "@/utils/supabase/client";
import {
  navTreeFetchStarted,
  navTreeFetchSucceeded,
  navTreeFetchFailed,
  fullContextFetchStarted,
  fullContextFetchSucceeded,
  fullContextFetchFailed,
  invalidateNavTree,
  invalidateFullContext,
  invalidateAll,
  type NavTreeResponse,
  type FullContextResponse,
} from "./hierarchySlice";
import type { AppDispatch } from "@/lib/redux/store";

// ─── Internal fetch helpers ───────────────────────────────────────────────

async function doFetchNavTree(dispatch: AppDispatch) {
  dispatch(navTreeFetchStarted());
  try {
    const { data, error } = await supabase.rpc("get_user_nav_tree");
    if (error) throw error;
    dispatch(
      navTreeFetchSucceeded(
        (data as unknown as NavTreeResponse) ?? { organizations: [] },
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[fetchNavTree]", message);
    dispatch(navTreeFetchFailed(message));
  }
}

async function doFetchFullContext(dispatch: AppDispatch) {
  dispatch(fullContextFetchStarted());
  try {
    const { data, error } = await supabase.rpc("get_user_full_context");
    if (error) throw error;
    dispatch(
      fullContextFetchSucceeded(
        (data as unknown as FullContextResponse) ?? { organizations: [] },
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[fetchFullContext]", message);
    dispatch(fullContextFetchFailed(message));
  }
}

// ─── fetchNavTree ─────────────────────────────────────────────────────────

/**
 * Fetch the lightweight org/project tree (no tasks).
 * Skips if already loading or successfully loaded.
 */
export function fetchNavTree() {
  return (
    dispatch: AppDispatch,
    getState: () => { hierarchy: { navTreeStatus: string } },
  ) => {
    const status = getState().hierarchy.navTreeStatus;
    if (status === "loading" || status === "success") return;
    return doFetchNavTree(dispatch);
  };
}

// ─── fetchFullContext ─────────────────────────────────────────────────────

/**
 * Fetch the full hierarchy including open tasks.
 * Skips if already loading or successfully loaded.
 */
export function fetchFullContext() {
  return (
    dispatch: AppDispatch,
    getState: () => { hierarchy: { fullContextStatus: string } },
  ) => {
    const status = getState().hierarchy.fullContextStatus;
    if (status === "loading" || status === "success") return;
    return doFetchFullContext(dispatch);
  };
}

// ─── Invalidate + re-fetch helpers ────────────────────────────────────────

/**
 * Reset the nav tree status to idle and trigger a fresh fetch.
 * Use after creating/updating/deleting orgs or projects.
 */
export function invalidateAndRefetchNavTree() {
  return (dispatch: AppDispatch) => {
    dispatch(invalidateNavTree());
    return doFetchNavTree(dispatch);
  };
}

/**
 * Reset full context and trigger a fresh fetch.
 * Use after task creates/updates/deletes.
 */
export function invalidateAndRefetchFullContext() {
  return (dispatch: AppDispatch) => {
    dispatch(invalidateFullContext());
    return doFetchFullContext(dispatch);
  };
}

/**
 * Invalidate both tree and full context and re-fetch nav tree.
 * Use after structural mutations (move org/project).
 */
export function invalidateAndRefetchAll() {
  return (dispatch: AppDispatch) => {
    dispatch(invalidateAll());
    return doFetchNavTree(dispatch);
  };
}
