"use client";

/**
 * AUTO-WATCH (VISION Part 18 item 5; Arman, 2026-10-14: "I still CANNOT see the progress of the
 * workflow properly and I still do not see any of the ai runs").
 *
 * With debug mode on, a page that starts a workflow run opens, by themselves:
 *   - the run's Workflow run window (the canonical `WorkflowRunWindow`: every step, its state,
 *     timing, AI steps clickable into Watch AI) — once per run, from its first event;
 *   - the page's Watch AI window — once per page load (a close sticks).
 *
 * Mounted once for admins (AdminFeatureProviderCore), never inside a menu: it used to live in the
 * sidebar's Watch AI button, so it ran only while that button was mounted, and it fired only once
 * a step's lane was bound to its server run — a binding that never arrived for most calls while
 * every AI step of a run shared one server row. Now any live root run on the page opens both.
 * A run that is already over when the page adopts it (a reload, a resumed address) opens nothing.
 */

import { useCallback, useEffect, useRef } from "react";
import { createSelector } from "@reduxjs/toolkit";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useCanWatchAi } from "./useCanWatchAi";
import { isAutomatedRun, selectLivePageAiRuns } from "./page-ai-runs";
import { AI_WATCH_PAGE_INSTANCE, watchAiRunAction } from "@/features/overlays/openers/aiWatchWindow";
import { markAutoOpened } from "@/features/window-panels/utils/autoOpenPlacement";
import { openWorkflowRunWindowAction, workflowRunWindowInstanceId } from "@/features/overlays/openers/workflowRunWindow";
import { runIsOver } from "@/features/workflow-runtime/types";
import type { RootState } from "@/lib/redux/store";

/** Root runs on this page that are running right now, as one stable key. */
const selectLiveRootRunKey = createSelector(
  [(state: RootState) => state.workflowRuns.byRunId],
  (byRunId) =>
    Object.values(byRunId)
      .filter((run) => run.parentRunId === null && run.status !== null && !runIsOver(run.status))
      .map((run) => run.runId)
      .sort()
      .join(","),
);

export default function AutoWatch() {
  const canWatch = useCanWatchAi();
  const dispatch = useAppDispatch();
  const liveRootRuns = useAppSelector(selectLiveRootRunKey);
  const live = useAppSelector(selectLivePageAiRuns);
  // A live workflow run makes every live AI call on the page its own; otherwise only workflow lanes count
  // (a person's own chat turn never opens Watch AI).
  const automatedKeys = live
    .filter((r) => (liveRootRuns ? true : isAutomatedRun(r)))
    .map((r) => r.key)
    .join(",");

  // MKT-076: Watch AI opens by itself once per page load; a close sticks until the person reopens it.
  const watchOpened = useRef(false);
  const openWatchAiOnce = useCallback(() => {
    if (watchOpened.current) return;
    watchOpened.current = true;
    markAutoOpened("aiWatchWindow", AI_WATCH_PAGE_INSTANCE);
    dispatch(watchAiRunAction());
  }, [dispatch]);

  const openedRuns = useRef(new Set<string>());
  useEffect(() => {
    if (!canWatch || !liveRootRuns) return;
    const fresh = liveRootRuns.split(",").filter((id) => !openedRuns.current.has(id));
    if (!fresh.length) return;
    for (const runId of fresh) {
      openedRuns.current.add(runId);
      markAutoOpened("workflowRunWindow", workflowRunWindowInstanceId(runId));
      dispatch(openWorkflowRunWindowAction({ runId }));
    }
    // Watch AI itself waits for the first AI call (below): a run with no call yet has nothing
    // to show, and the window would only sit over the page's input.
  }, [canWatch, liveRootRuns, dispatch]);

  const openedCalls = useRef(new Set<string>());
  useEffect(() => {
    if (!canWatch || !automatedKeys) return;
    const fresh = automatedKeys.split(",").filter((k) => !openedCalls.current.has(k));
    if (!fresh.length) return;
    for (const k of fresh) openedCalls.current.add(k);
    openWatchAiOnce();
  }, [canWatch, automatedKeys, openWatchAiOnce]);

  return null;
}
