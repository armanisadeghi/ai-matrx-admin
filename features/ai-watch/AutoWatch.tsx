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

import { useCallback, useEffect, useRef, useState } from "react";
import { createSelector } from "@reduxjs/toolkit";
import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/redux/hooks";
import { useCanWatchAi } from "./useCanWatchAi";
import { isAutomatedRun, selectLivePageAiRuns } from "./page-ai-runs";
import { AI_WATCH_PAGE_INSTANCE, watchAiRunAction } from "@/features/overlays/openers/aiWatchWindow";
import { AUTO_OPEN_NO_ROOM_EVENT, autoOpenHasRoom, markAutoOpened } from "@/features/window-panels/utils/autoOpenPlacement";
import { openWorkflowRunWindowAction, workflowRunWindowInstanceId } from "@/features/overlays/openers/workflowRunWindow";
import { runIsOver } from "@/features/workflow-runtime/types";
import { useOptionalCanvas } from "@ai-matrx/canvas/react";
import { openToolInCanvas } from "@/features/canvas/host/toolCanvas";
import { AI_WATCH_CANVAS_ID, AI_WATCH_CANVAS_KEY, WORKFLOW_RUN_CANVAS_ID } from "./canvas/runViewKinds";
import { selectOpenInstances } from "@/lib/redux/slices/overlaySlice";
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
  const store = useAppStore();
  const liveRootRuns = useAppSelector(selectLiveRootRunKey);
  const live = useAppSelector(selectLivePageAiRuns);
  // A live workflow run makes every live AI call on the page its own; otherwise only workflow lanes count
  // (a person's own chat turn never opens Watch AI).
  const automatedKeys = live
    .filter((r) => (liveRootRuns ? true : isAutomatedRun(r)))
    .map((r) => r.key)
    .join(",");

  // MKT-104: a floating window opens by itself only when a gutter beside the page's working column can
  // hold it; with none, the same view opens in the shell's right-hand canvas column, which narrows the
  // page instead of covering it. Nothing is ever skipped. Re-measured each second while something is
  // waiting, because a page lays itself out after a run starts. `null` = not measured yet.
  const canvas = useOptionalCanvas();
  const [room, setRoom] = useState<boolean | null>(null);
  const waiting = Boolean(liveRootRuns || automatedKeys);
  useEffect(() => {
    if (!canWatch || !waiting) return undefined;
    const first = window.setTimeout(() => setRoom(autoOpenHasRoom()), 0);
    const timer = window.setInterval(() => setRoom(autoOpenHasRoom()), 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [canWatch, waiting]);

  const openRunInCanvas = useCallback(
    (runId: string) => {
      openToolInCanvas(canvas, { kind: WORKFLOW_RUN_CANVAS_ID, key: runId, title: "Workflow run", data: { runId } });
    },
    [canvas],
  );
  const openWatchInCanvas = useCallback(() => {
    openToolInCanvas(canvas, { kind: AI_WATCH_CANVAS_ID, key: AI_WATCH_CANVAS_KEY, title: "Watch AI", data: {} });
  }, [canvas]);

  // A docked window the page grew over closes itself and says so here: its view moves to the canvas.
  useEffect(() => {
    const onNoRoom = (e: Event) => {
      const { overlayId, instanceId } = (e as CustomEvent<{ overlayId: string; instanceId: string }>).detail;
      if (overlayId === "workflowRunWindow" && instanceId.startsWith("workflow-run:")) {
        openRunInCanvas(instanceId.slice("workflow-run:".length));
      } else if (overlayId === "aiWatchWindow") openWatchInCanvas();
    };
    window.addEventListener(AUTO_OPEN_NO_ROOM_EVENT, onNoRoom);
    return () => window.removeEventListener(AUTO_OPEN_NO_ROOM_EVENT, onNoRoom);
  }, [openRunInCanvas, openWatchInCanvas]);

  // MKT-076: Watch AI opens by itself once per page load; a close sticks until the person reopens it.
  const watchOpened = useRef(false);
  const openWatchAiOnce = useCallback(() => {
    if (watchOpened.current) return;
    // Never a second copy: a window already open on the page's one instance is the one.
    const open = selectOpenInstances(store.getState(), "aiWatchWindow");
    if (open.some((i) => i.instanceId === AI_WATCH_PAGE_INSTANCE)) {
      watchOpened.current = true;
      return;
    }
    watchOpened.current = true;
    if (!room) {
      openWatchInCanvas();
      return;
    }
    markAutoOpened("aiWatchWindow", AI_WATCH_PAGE_INSTANCE);
    dispatch(watchAiRunAction());
  }, [dispatch, store, room, openWatchInCanvas]);

  const openedRuns = useRef(new Set<string>());
  useEffect(() => {
    if (!canWatch || room === null || !liveRootRuns) return;
    const fresh = liveRootRuns.split(",").filter((id) => !openedRuns.current.has(id));
    if (!fresh.length) return;
    for (const runId of fresh) {
      openedRuns.current.add(runId);
      if (!room) {
        openRunInCanvas(runId);
        continue;
      }
      markAutoOpened("workflowRunWindow", workflowRunWindowInstanceId(runId));
      dispatch(openWorkflowRunWindowAction({ runId }));
    }
    // Watch AI itself waits for the first AI call (below): a run with no call yet has nothing
    // to show, and the window would only sit over the page's input.
  }, [canWatch, room, liveRootRuns, dispatch, openRunInCanvas]);

  const openedCalls = useRef(new Set<string>());
  useEffect(() => {
    if (!canWatch || room === null || !automatedKeys) return;
    const fresh = automatedKeys.split(",").filter((k) => !openedCalls.current.has(k));
    if (!fresh.length) return;
    for (const k of fresh) openedCalls.current.add(k);
    openWatchAiOnce();
  }, [canWatch, room, automatedKeys, openWatchAiOnce]);

  return null;
}
