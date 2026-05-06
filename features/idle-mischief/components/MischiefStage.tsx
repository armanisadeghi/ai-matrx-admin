// features/idle-mischief/components/MischiefStage.tsx
//
// The orchestrator. Renders no DOM.
//
// Responsibilities:
//   1. Watch user idle time and fire the next-up act when its threshold is hit.
//   2. While ANY act is running, attach a high-priority capture-phase listener
//      that fires snap-back on the FIRST mouse/keyboard/scroll/touch event.
//   3. Honor manual triggers from the dev panel.
//   4. On natural act completion, advance the playhead.
//   5. On snap-back, fully restore via restoreAll().
//   6. Push a structured log entry to Redux on every meaningful event so the
//      diagnostics popover (admin-only) can show what's happening in real time.
//      Errors are caught and logged here — never silently swallowed.

"use client";

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/redux/hooks";
import { useIdleDetection } from "../hooks/useIdleDetection";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { ACT_QUEUE, SNAPBACK_DURATION_MS } from "../constants";
import { ACT_PLAYERS } from "../acts";
import type { MischiefActId } from "../types";
import {
  pushLog,
  selectMischiefManualTrigger,
  selectMischiefSettings,
  selectMischiefStatus,
  setCurrentAct,
  setRestoreStats,
  setStatus,
  showStarted,
} from "../state/idleMischiefSlice";
import { restoreAll, type RestoreStats } from "../utils/snapshot";
import { isUserBusy, whyUserIsBusy } from "../utils/isUserBusy";

interface RecordingsLike {
  isRecording?: boolean;
  isTranscribing?: boolean;
}
// Module-level stable reference; returns a primitive boolean which compares
// by ===, so `useAppSelector` won't trigger re-renders unless the underlying
// flag actually changes. No `createSelector` needed for a pure boolean read.
const selectRecordingsBusy = (s: { recordings?: RecordingsLike }): boolean =>
  Boolean(s.recordings?.isRecording || s.recordings?.isTranscribing);

interface RunningAct {
  id: MischiefActId;
  actCleanup: () => void;
  detachActivity: () => void;
  cancelTimer: () => void;
}

/**
 * Snap-back triggers — same broad definition as `useIdleDetection.ts`. When
 * any of these fire while an act is playing, the act is dismissed and the
 * page is restored. Capture-phase + passive so we beat any other listener
 * and never block the event flow.
 */
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "pointermove",
  "pointerdown",
  "wheel",
  "touchstart",
  "touchmove",
  "keydown",
  "input",
  "compositionstart",
  "compositionupdate",
  "focusin",
  "paste",
  "cut",
  "copy",
];

export function MischiefStage() {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const { idleSeconds, bumpActivity } = useIdleDetection();
  const reducedMotion = useReducedMotion();
  const settings = useAppSelector(selectMischiefSettings);
  const manualTrigger = useAppSelector(selectMischiefManualTrigger);
  const status = useAppSelector(selectMischiefStatus);
  const recordingsBusy = useAppSelector(selectRecordingsBusy);

  const disabled =
    reducedMotion ||
    !settings.enabled ||
    process.env.NEXT_PUBLIC_DISABLE_MISCHIEF === "1";

  const runningRef = useRef<RunningAct | null>(null);
  const playheadRef = useRef<number>(0);
  const lastIdleSecondsRef = useRef<number>(0);

  // Logging helper — wraps dispatch with a try/catch so a logging failure
  // can never break the animation lifecycle.
  const log = (level: "info" | "warn" | "error", message: string) => {
    try {
      dispatch(pushLog({ level, message }));
    } catch {}
  };

  // Persist + log restore stats so the popover can show them.
  const recordRestoreStats = (stats: RestoreStats, source: string) => {
    try {
      dispatch(
        setRestoreStats({
          ...stats,
          ts: Date.now(),
        }),
      );
    } catch {}
    if (stats.sweptClones > 0 || stats.sweptOriginals > 0) {
      log(
        "warn",
        `[${source}] sweep caught stragglers — clones:${stats.sweptClones} originals:${stats.sweptOriginals}`,
      );
    }
  };

  // ── Hard snap-back: cancel everything, run restoreAll, return to idle ─────
  const hardSnapBack = (
    markStatus: "idle" | "snapping-back" = "snapping-back",
    source = "snap-back",
  ) => {
    const running = runningRef.current;
    if (running) {
      log("info", `↺ ${source}: stopping ${running.id}`);
      running.cancelTimer();
      running.detachActivity();
      try {
        running.actCleanup();
      } catch (err) {
        log(
          "error",
          `actCleanup threw for "${running.id}": ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
      runningRef.current = null;
    }
    let stats: RestoreStats;
    try {
      stats = restoreAll();
    } catch (err) {
      log(
        "error",
        `restoreAll threw: ${err instanceof Error ? err.message : String(err)}`,
      );
      stats = {
        cleanups: 0,
        portals: 0,
        snapshots: 0,
        sweptClones: 0,
        sweptOriginals: 0,
      };
    }
    recordRestoreStats(stats, source);
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
    // Last-chance busy check: even if the scheduler decided to fire, the
    // user may have started typing / dictating / recording a microsecond
    // before this call. Re-check synchronously and abort if so.
    const busyReason = whyUserIsBusy(store.getState());
    if (busyReason) {
      log("info", `⊘ skipped "${id}" — ${busyReason}`);
      return;
    }

    if (runningRef.current) {
      hardSnapBack("snapping-back", "preempted");
    }

    const player = ACT_PLAYERS[id];
    if (!player) {
      log("error", `no player registered for "${id}"`);
      return;
    }

    let actCleanup: () => void = () => {};
    try {
      actCleanup = player();
    } catch (err) {
      log(
        "error",
        `act "${id}" threw on start: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      try {
        const stats = restoreAll();
        recordRestoreStats(stats, "after-throw");
      } catch {}
      return;
    }

    log("info", `▶ ${id} started`);
    dispatch(showStarted());

    const adjustedDur = Math.max(
      400,
      durationMs / Math.max(0.25, settings.speed),
    );

    let timerId: number | null = window.setTimeout(() => {
      timerId = null;
      detachActivity();
      try {
        actCleanup();
      } catch (err) {
        log(
          "error",
          `actCleanup threw for "${id}": ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
      let stats: RestoreStats;
      try {
        stats = restoreAll();
      } catch (err) {
        log(
          "error",
          `restoreAll threw on natural-end: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
        stats = {
          cleanups: 0,
          portals: 0,
          snapshots: 0,
          sweptClones: 0,
          sweptOriginals: 0,
        };
      }
      recordRestoreStats(stats, "natural-end");
      runningRef.current = null;
      dispatch(setCurrentAct(null));
      dispatch(setStatus("idle"));
      log("info", `✓ ${id} ended (natural)`);
    }, adjustedDur);
    const cancelTimer = () => {
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
    };

    // First user activity event → snap-back ONCE, then immediately detach
    // every listener. We do NOT keep listening for 900ms and re-running
    // restoreAll on every subsequent event (that was a re-render storm —
    // pointermove fires dozens of times per second and each call did a
    // full document sweep with querySelectorAll). Instead, a single hard
    // snap-back is enough; the sledgehammer sweep inside restoreAll() is
    // already idempotent and document-wide.
    let activityArmed = false;
    const onActivity = () => {
      if (!activityArmed) return;
      activityArmed = false;
      hardSnapBack("snapping-back", "user-activity");
      // Detach asynchronously so we don't tear down the listener registry
      // mid-event-dispatch (some browsers don't like that).
      window.setTimeout(detachActivity, 0);
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
    }, 300);
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
    if (disabled) {
      log("warn", `manual trigger of "${manualTrigger.actId}" — disabled`);
      return;
    }
    bumpActivity();
    const sched = ACT_QUEUE.find((s) => s.id === manualTrigger.actId);
    if (!sched) {
      log("error", `manual trigger: no schedule for "${manualTrigger.actId}"`);
      return;
    }
    startAct(sched.id, sched.duration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualTrigger.nonce, manualTrigger.actId, disabled]);

  // ── Recording / transcribing → instant snap-back ──────────────────────────
  // If audio recording starts (or transcription starts) WHILE an act is
  // playing, we abort. The user is dictating / waiting on a transcript and
  // any animation noise on the page is unwelcome.
  useEffect(() => {
    if (!recordingsBusy) return;
    if (!runningRef.current) return;
    log("warn", "↺ recording/transcribing detected — snapping back");
    hardSnapBack("snapping-back", "recording-active");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordingsBusy]);

  // ── External snap-back request (dev panel "Snap back now") ────────────────
  useEffect(() => {
    if (status !== "snapping-back") return;
    if (!runningRef.current) {
      try {
        const stats = restoreAll();
        recordRestoreStats(stats, "external-no-running");
      } catch {}
      window.setTimeout(() => dispatch(setStatus("idle")), SNAPBACK_DURATION_MS);
      return;
    }
    hardSnapBack("snapping-back", "external-request");
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
      try {
        restoreAll();
      } catch {}
    };
  }, []);

  // ── Devtools emergency hatch ─────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    (window as unknown as Record<string, unknown>).__mischiefForceReset = () => {
      if (runningRef.current) {
        runningRef.current.cancelTimer();
        runningRef.current.detachActivity();
        try {
          runningRef.current.actCleanup();
        } catch {}
        runningRef.current = null;
      }
      try {
        const stats = restoreAll();
        recordRestoreStats(stats, "force-reset");
      } catch {}
      dispatch(setCurrentAct(null));
      dispatch(setStatus("idle"));
      log("info", "force-reset complete");
    };
    return () => {
      delete (window as unknown as Record<string, unknown>).__mischiefForceReset;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
