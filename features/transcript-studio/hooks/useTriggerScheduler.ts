"use client";

/**
 * useTriggerScheduler
 *
 * Drives the per-column agent passes for an active studio session. Phase 5
 * implements the cleaning column (Column 2). Phases 6 and 7 will add
 * concepts (Column 3) and the Column 4 module on the same scheduler.
 *
 * Cadence:
 *   - Cleanup: every `cleaning_interval_ms` (default 30s) WHILE recording.
 *     A ±`silenceWindowMs` window lets the scheduler defer to a quiet
 *     moment when one's available; a hard ceiling at `interval + window`
 *     forces a flush regardless of audio level.
 *   - On `recording-start`: fire one immediate pass with cause
 *     `"session-start"` so Column 2 begins populating right away.
 *   - On `recording-stop`: fire one final pass with cause `"session-stop"`
 *     so any tail-end raw text gets cleaned up.
 *
 * Concurrency:
 *   At most one cleanup pass in flight at a time. New ticks while a pass
 *   is running set a `pendingFlush` flag, which causes the scheduler to
 *   re-fire immediately after the current pass resolves. Network failures
 *   are non-fatal — the next tick retries with a wider window.
 *
 * The scheduler runs only while the component holding it is mounted (the
 * studio session view). Recording lives in the global provider so it
 * survives navigation; agent passes do NOT — leaving the studio pauses
 * cleanup until you come back.
 */

import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  CLEANING_INTERVAL_DEFAULT_MS,
  CLEANING_SILENCE_WINDOW_MS,
  SILENCE_LEVEL_THRESHOLD,
  TRIGGER_SCHEDULER_TICK_MS,
} from "../constants";
import { runCleaningPassThunk } from "../redux/runCleaningPass.thunk";

interface UseTriggerSchedulerOptions {
  sessionId: string | null;
  /** Per-session override; falls back to the global default. */
  cleaningIntervalMs?: number;
  /** Override the silence-detection window. Falls back to ±5s. */
  silenceWindowMs?: number;
}

/**
 * Internal per-runner state. Mutable refs only — never trigger re-renders.
 */
interface RunnerState {
  inFlight: boolean;
  pendingFlush: boolean;
  lastFlushAtMs: number;
}

const NEW_RUNNER = (): RunnerState => ({
  inFlight: false,
  pendingFlush: false,
  lastFlushAtMs: 0,
});

export function useTriggerScheduler({
  sessionId,
  cleaningIntervalMs = CLEANING_INTERVAL_DEFAULT_MS,
  silenceWindowMs = CLEANING_SILENCE_WINDOW_MS,
}: UseTriggerSchedulerOptions): void {
  const dispatch = useAppDispatch();

  const isOwnedRecording = useAppSelector(
    (s) =>
      s.recordings.isRecording &&
      s.recordings.context?.kind === "studio" &&
      s.recordings.context.sessionId === sessionId,
  );
  const isPaused = useAppSelector((s) => s.recordings.isPaused);
  const audioLevel = useAppSelector((s) => s.recordings.audioLevel);

  // Refs: scheduler + runner state. Refs avoid effect-loops driven by
  // re-renders of audioLevel (~60 fps).
  const cleaningRef = useRef<RunnerState>(NEW_RUNNER());
  const audioLevelRef = useRef(audioLevel);
  audioLevelRef.current = audioLevel;
  const isPausedRef = useRef(isPaused);
  isPausedRef.current = isPaused;

  // ── Run a cleanup pass with the per-column mutex.
  const runCleanup = useRef<
    (cause: "interval" | "session-start" | "session-stop" | "manual") => void
  >((_cause) => {});
  runCleanup.current = (cause) => {
    if (!sessionId) return;
    const r = cleaningRef.current;
    if (r.inFlight) {
      r.pendingFlush = true;
      return;
    }
    r.inFlight = true;
    r.lastFlushAtMs = Date.now();
    void dispatch(
      runCleaningPassThunk({ sessionId, triggerCause: cause }),
    ).finally(() => {
      r.inFlight = false;
      if (r.pendingFlush) {
        r.pendingFlush = false;
        // Fire again on the next macrotask so we don't recurse on the same
        // promise resolution and starve other event-loop work.
        setTimeout(() => runCleanup.current("interval"), 0);
      }
    });
  };

  // ── Recording start / stop edges.
  const wasRecordingRef = useRef(false);
  useEffect(() => {
    const wasRecording = wasRecordingRef.current;
    wasRecordingRef.current = isOwnedRecording;
    if (!sessionId) return;
    if (!wasRecording && isOwnedRecording) {
      // Edge: start. Reset the runner state and mark "now" as the last
      // flush time so the interval fires the next tick at the right moment.
      cleaningRef.current = NEW_RUNNER();
      cleaningRef.current.lastFlushAtMs = Date.now();
      runCleanup.current("session-start");
    } else if (wasRecording && !isOwnedRecording) {
      // Edge: stop. Fire one final pass to catch any uncleaned tail-end text.
      runCleanup.current("session-stop");
    }
  }, [isOwnedRecording, sessionId]);

  // ── Tick loop: fires every TRIGGER_SCHEDULER_TICK_MS while recording.
  useEffect(() => {
    if (!sessionId || !isOwnedRecording) return;
    const id = setInterval(() => {
      if (isPausedRef.current) return;
      const r = cleaningRef.current;
      if (r.inFlight) return;
      const sinceLast = Date.now() - r.lastFlushAtMs;
      const earliest = cleaningIntervalMs - silenceWindowMs;
      const latest = cleaningIntervalMs + silenceWindowMs;
      if (sinceLast < earliest) return;
      if (sinceLast < latest) {
        // Inside the silence-detection window. Flush only when audio is
        // currently quiet — otherwise wait for either silence OR the hard
        // ceiling at `latest`.
        if (audioLevelRef.current >= SILENCE_LEVEL_THRESHOLD) return;
      }
      // sinceLast >= latest -> force flush regardless of silence.
      runCleanup.current("interval");
    }, TRIGGER_SCHEDULER_TICK_MS);
    return () => clearInterval(id);
  }, [sessionId, isOwnedRecording, cleaningIntervalMs, silenceWindowMs]);
}
