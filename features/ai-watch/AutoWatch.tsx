"use client";

/**
 * AUTO-WATCH (VISION Part 18 item 5; Arman, 2026-10-14: "I still CANNOT see the progress of the
 * workflow properly and I still do not see any of the ai runs").
 *
 * With debug mode on, a page that starts a workflow run opens, by themselves:
 *   - the run's Workflow run window (the canonical `WorkflowRunWindow`: every step, its state,
 *     timing, AI steps clickable into Watch AI) — once per run, from its first event;
 *   - the page's Watch AI window — once per run, and again for every new automated AI call.
 *
 * Mounted once for admins (AdminFeatureProviderCore), never inside a menu: it used to live in the
 * sidebar's Watch AI button, so it ran only while that button was mounted, and it fired only once
 * a step's lane was bound to its server run — a binding that never arrived for most calls while
 * every AI step of a run shared one server row. Now any live root run on the page opens both.
 * A run that is already over when the page adopts it (a reload, a resumed address) opens nothing.
 */

import { useEffect, useRef } from "react";
import { createSelector } from "@reduxjs/toolkit";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useCanWatchAi } from "./useCanWatchAi";
import { isAutomatedRun, selectLivePageAiRuns } from "./page-ai-runs";
import { watchAiRunAction } from "@/features/overlays/openers/aiWatchWindow";
import { openWorkflowRunWindowAction } from "@/features/overlays/openers/workflowRunWindow";
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

const PAGE_WATCH = { pageRuns: true, instanceId: "ai-watch:page" } as const;

export default function AutoWatch() {
  const canWatch = useCanWatchAi();
  const dispatch = useAppDispatch();
  const liveRootRuns = useAppSelector(selectLiveRootRunKey);
  const live = useAppSelector(selectLivePageAiRuns);
  const automatedKeys = live.filter(isAutomatedRun).map((r) => r.key).join(",");

  const openedRuns = useRef(new Set<string>());
  useEffect(() => {
    if (!canWatch || !liveRootRuns) return;
    const fresh = liveRootRuns.split(",").filter((id) => !openedRuns.current.has(id));
    if (!fresh.length) return;
    for (const runId of fresh) {
      openedRuns.current.add(runId);
      dispatch(openWorkflowRunWindowAction({ runId }));
    }
    dispatch(watchAiRunAction(PAGE_WATCH));
  }, [canWatch, liveRootRuns, dispatch]);

  const openedCalls = useRef(new Set<string>());
  useEffect(() => {
    if (!canWatch || !automatedKeys) return;
    const fresh = automatedKeys.split(",").filter((k) => !openedCalls.current.has(k));
    if (!fresh.length) return;
    for (const k of fresh) openedCalls.current.add(k);
    dispatch(watchAiRunAction(PAGE_WATCH));
  }, [canWatch, automatedKeys, dispatch]);

  return null;
}
