// features/idle-mischief/components/MischiefStage.tsx
//
// The orchestrator. Renders no DOM.
//
// Responsibilities:
//   1. Watch user idle time and fire the next-up act when its threshold is hit.
//   2. While ANY act is running, attach a high-priority capture-phase listener
//      that fires snap-back on the FIRST mouse/keyboard/scroll/touch event.
//      This bypasses the idle-seconds counter entirely — no race conditions,
//      no "missed transition" bugs.
//   3. Honor manual triggers from the dev panel.
//   4. On natural act completion, advance the playhead.
//   5. On snap-back, fully restore via restoreAll().

"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { useIdleDetection } from "../hooks/useIdleDetection";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { ACT_QUEUE, SNAPBACK_DURATION_MS } from "../constants";
import { ACT_PLAYERS } from "../acts";
import type { MischiefActId } from "../types";
import {
  selectMischiefManualTrigger,
  selectMischiefSettings,
  selectMischiefStatus,
  setCurrentAct,
  setStatus,
} from "../state/idleMischiefSlice";
import { restoreAll } from "../utils/snapshot";

interface RunningAct {
  id: MischiefActId;
  /** Cleanup that the act itself returned. */
  actCleanup: () => void;
  /** Detach the snap-back activity listeners. */
  detachActivity: () => void;
  /** Cancel the natural-end timer. */
  cancelTimer: () => void;
}

/**
 * Activity event names. Capture-phase + passive — fastest possible response
 * to "user is back". `pointermove` covers mouse and touch in one event.
 */
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "pointermove",
  "pointerdown",
  "keydown",
  "wheel",
  "touchstart",
];

export function MischiefStage() {
  const dispatch = useAppDispatch();
  const { idleSeconds, bumpActivity } = useIdleDetection();
  const reducedMotion = useReducedMotion();
  const settings = useAppSelector(selectMischiefSettings);
  const manualTrigger = useAppSelector(selectMischiefManualTrigger);
  const status = useAppSelector(selectMischiefStatus);

  const disabled =
    reducedMotion ||
    !settings.enabled ||
    process.env.NEXT_PUBLIC_DISABLE_MISCHIEF === "1";

  const runningRef = useRef<RunningAct | null>(null);
  const playheadRef = useRef<number>(0);
  const lastIdleSecondsRef = useRef<number>(0);

  // ── Hard snap-back: cancel everything, run restoreAll, return to idle ─────
  const hardSnapBack = (markStatus: "idle" | "snapping-back" = "snapping-back") => {
    const running = runningRef.current;
    if (running) {
      running.cancelTimer();
      running.detachActivity();
      try {
        running.actCleanup();
      } catch {}
      runningRef.current = null;
    }
    // Belt-and-suspenders: even if no running act tracked, sweep the registry.
    restoreAll();
    dispatch(setCurrentAct(null));
    dispatch(setStatus(markStatus));
    if (markStatus === "snapping-back") {
      window.setTimeout(
        () => dispatch(setStatus("idle")),
        SNAPBACK_DURATION_MS,
      );
    }
  };

  // ── Start an act ──────────────────────────────────────────────────────────
  const startAct = (id: MischiefActId, durationMs: number) => {
    // If something is already running, snap it back FIRST (synchronous).
    if (runningRef.current) {
      hardSnapBack("snapping-back");
    }

    const player = ACT_PLAYERS[id];
    if (!player) return;

    let actCleanup: () => void = () => {};
    try {
      actCleanup = player();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[mischief] act threw on start:", id, err);
      restoreAll();
      return;
    }

    const adjustedDur = Math.max(
      400,
      durationMs / Math.max(0.25, settings.speed),
    );

    // Natural-end timer
    let timerId: number | null = window.setTimeout(() => {
      timerId = null;
      // Natural completion: also detach activity listeners + run cleanup.
      detachActivity();
      try {
        actCleanup();
      } catch {}
      restoreAll();
      runningRef.current = null;
      dispatch(setCurrentAct(null));
      dispatch(setStatus("idle"));
    }, adjustedDur);
    const cancelTimer = () => {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    };

    // Activity listener — attached AFTER a 350ms grace window so the click
    // that spawned the act doesn't immediately snap it back. Capture-phase
    // so we beat any other listener on the page.
    let activityArmed = false;
    const onActivity = () => {
      if (!activityArmed) return;
      // First trigger wins: detach and snap back.
      hardSnapBack("snapping-back");
    };
    const detachActivity = () => {
      activityArmed = false;
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, onActivity, true);
      }
    };
    const armActivity = window.setTimeout(() => {
      activityArmed = true;
      for (const evt of ACTIVITY_EVENTS) {
        window.addEventListener(evt, onActivity, {
          passive: true,
          capture: true,
        });
      }
    }, 350);
    const wrappedDetach = () => {
      clearTimeout(armActivity);
      detachActivity();
    };

    runningRef.current = {
      id,
      actCleanup,
      detachActivity: wrappedDetach,
      cancelTimer,
    };
    dispatch(setCurrentAct(id));
    dispatch(setStatus("playing"));
  };

  // ── Idle-driven scheduler ─────────────────────────────────────────────────
  useEffect(() => {
    if (disabled) return;
    const prev = lastIdleSecondsRef.current;
    lastIdleSecondsRef.current = idleSeconds;

    // idle reset → done by the activity listener while running. If a reset
    // happens with no act running, just reset the playhead and return.
    if (idleSeconds === 0 && prev > 0) {
      if (!runningRef.current) playheadRef.current = 0;
      return;
    }

    if (runningRef.current) return;

    const effective = idleSeconds * settings.speed;
    const nextIdx = playheadRef.current;
    if (nextIdx >= ACT_QUEUE.length) {
      if (settings.loop) playheadRef.current = 0;
      return;
    }
    const next = ACT_QUEUE[nextIdx];
    if (effective >= next.threshold) {
      playheadRef.current = nextIdx + 1;
      startAct(next.id, next.duration);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idleSeconds, disabled, settings.speed, settings.loop]);

  // ── Manual trigger from dev panel ─────────────────────────────────────────
  useEffect(() => {
    if (manualTrigger.nonce === 0 || !manualTrigger.actId) return;
    if (disabled) return;
    bumpActivity();
    const sched = ACT_QUEUE.find((s) => s.id === manualTrigger.actId);
    if (!sched) return;
    startAct(sched.id, sched.duration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualTrigger.nonce, manualTrigger.actId, disabled]);

  // ── External snap-back request (dev panel "Snap back now") ────────────────
  useEffect(() => {
    if (status !== "snapping-back") return;
    if (!runningRef.current) {
      restoreAll();
      window.setTimeout(() => dispatch(setStatus("idle")), SNAPBACK_DURATION_MS);
      return;
    }
    hardSnapBack("snapping-back");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (runningRef.current) {
        runningRef.current.cancelTimer();
        runningRef.current.detachActivity();
        try {
          runningRef.current.actCleanup();
        } catch {}
      }
      restoreAll();
    };
  }, []);

  return null;
}
