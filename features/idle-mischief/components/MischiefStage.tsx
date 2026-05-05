// features/idle-mischief/components/MischiefStage.tsx
//
// The orchestrator. Watches idle time, schedules acts, handles manual
// triggers from the dev panel, and fires snap-back the instant the user
// returns. Renders nothing visible itself — all the visible mischief is
// portal-mounted by individual acts.

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

interface RunningAct {
  id: MischiefActId;
  cleanup: () => void;
  endsAt: number;
  timer: number;
}

export function MischiefStage() {
  const dispatch = useAppDispatch();
  const { idleSeconds, bumpActivity } = useIdleDetection();
  const reducedMotion = useReducedMotion();
  const settings = useAppSelector(selectMischiefSettings);
  const manualTrigger = useAppSelector(selectMischiefManualTrigger);
  const status = useAppSelector(selectMischiefStatus);

  // Mischief is hard-disabled when:
  //   - reduced-motion is requested at the OS level
  //   - settings.enabled is false
  //   - NEXT_PUBLIC_DISABLE_MISCHIEF is set (e2e / Playwright)
  const disabled =
    reducedMotion ||
    !settings.enabled ||
    process.env.NEXT_PUBLIC_DISABLE_MISCHIEF === "1";

  const runningRef = useRef<RunningAct | null>(null);
  const playheadRef = useRef<number>(0);
  const lastIdleSecondsRef = useRef<number>(0);
  /** While Date.now() is below this value, an idle→0 activity transition
   *  is suppressed. Set by the manual-trigger path so the click that spawns
   *  an act doesn't immediately count as the user returning. */
  const ignoreUntilRef = useRef<number>(0);

  // ── Stop helper (also clears Redux state) ─────────────────────────────────
  const stopCurrent = (markStatus: "idle" | "snapping-back" = "idle") => {
    const running = runningRef.current;
    if (!running) {
      dispatch(setStatus(markStatus));
      dispatch(setCurrentAct(null));
      return;
    }
    clearTimeout(running.timer);
    try {
      running.cleanup();
    } catch {}
    runningRef.current = null;
    dispatch(setCurrentAct(null));
    dispatch(setStatus(markStatus));
  };

  // ── Start an act by id ────────────────────────────────────────────────────
  const startAct = (id: MischiefActId, durationMs: number) => {
    // If something is already running, snap it back first
    if (runningRef.current) {
      stopCurrent("snapping-back");
    }
    const player = ACT_PLAYERS[id];
    if (!player) return;
    const cleanup = player();
    const adjustedDur = Math.max(400, durationMs / Math.max(0.25, settings.speed));
    const timer = window.setTimeout(() => {
      // Natural end-of-act
      try {
        cleanup();
      } catch {}
      runningRef.current = null;
      dispatch(setCurrentAct(null));
      dispatch(setStatus("idle"));
    }, adjustedDur);

    runningRef.current = {
      id,
      cleanup,
      endsAt: Date.now() + adjustedDur,
      timer,
    };
    dispatch(setCurrentAct(id));
    dispatch(setStatus("playing"));
  };

  // ── Idle-driven scheduler ─────────────────────────────────────────────────
  // Each tick: compare idleSeconds * speed to the next act's threshold.
  useEffect(() => {
    if (disabled) return;

    const prev = lastIdleSecondsRef.current;
    lastIdleSecondsRef.current = idleSeconds;

    // Activity returned → snap back everything (unless we just manually
    // triggered an act and are still inside the grace window).
    const insideGrace = Date.now() < ignoreUntilRef.current;
    if (idleSeconds === 0 && prev > 0) {
      if (insideGrace) {
        // Eat this single transition; subsequent activity will still snap back.
        return;
      }
      if (runningRef.current) {
        stopCurrent("snapping-back");
        // Briefly mark snapping-back, then idle
        window.setTimeout(() => dispatch(setStatus("idle")), SNAPBACK_DURATION_MS);
      } else {
        dispatch(setStatus("idle"));
      }
      playheadRef.current = 0;
      return;
    }

    // Already playing → wait for it to end
    if (runningRef.current) return;

    // Find next act whose threshold has been reached
    const effective = idleSeconds * settings.speed;
    const nextIdx = playheadRef.current;
    if (nextIdx >= ACT_QUEUE.length) {
      if (settings.loop) {
        playheadRef.current = 0;
      }
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
    // Open a 200ms "grace window": the click event itself fires bumpActivity
    // which would otherwise look like "user returned" and snap-back the act
    // we're about to start. Suppress just that one transition.
    ignoreUntilRef.current = Date.now() + 200;
    bumpActivity();
    const sched = ACT_QUEUE.find((s) => s.id === manualTrigger.actId);
    if (!sched) return;
    startAct(sched.id, sched.duration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualTrigger.nonce, manualTrigger.actId, disabled]);

  // ── External snap-back request (dev panel "Snap back now") ────────────────
  useEffect(() => {
    if (status !== "snapping-back") return;
    if (!runningRef.current) return;
    stopCurrent("snapping-back");
    const t = window.setTimeout(() => dispatch(setStatus("idle")), SNAPBACK_DURATION_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (runningRef.current) {
        clearTimeout(runningRef.current.timer);
        try {
          runningRef.current.cleanup();
        } catch {}
        runningRef.current = null;
      }
    };
  }, []);

  return null;
}
