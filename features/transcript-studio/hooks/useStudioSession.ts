"use client";

/**
 * useStudioSession
 *
 * Bridges the GlobalRecordingProvider <-> the transcript-studio Redux state
 * for a specific session. Owns the start/stop lifecycle and the per-chunk
 * `onChunkComplete` -> `ingestRawChunkThunk` plumbing.
 *
 * Single global recording at a time (enforced by GlobalRecordingProvider).
 * If another session or feature already holds the recorder, `start()`
 * surfaces a toast error and short-circuits.
 */

import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  useGlobalRecording,
  type StartRecordingArgs,
} from "@/providers/GlobalRecordingProvider";
import {
  ingestRawChunkThunk,
  startSessionRecordingThunk,
  stopSessionRecordingThunk,
} from "../redux/thunks";

interface UseStudioSessionOptions {
  sessionId: string | null;
}

interface UseStudioSessionReturn {
  /** True iff THIS session currently owns the global recorder. */
  isOwnedRecording: boolean;
  /** True iff some recording is in flight, not necessarily this session. */
  isAnyRecording: boolean;
  isPaused: boolean;
  audioLevel: number;
  durationSec: number;
  start: () => Promise<void>;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  /** Detail of why a start failed, surfaced via toast. */
  lastError: string | null;
}

export function useStudioSession({
  sessionId,
}: UseStudioSessionOptions): UseStudioSessionReturn {
  const dispatch = useAppDispatch();
  const recording = useGlobalRecording();

  const recordings = useAppSelector((s) => s.recordings);

  const isOwnedRecording =
    recordings.isRecording &&
    recordings.context?.kind === "studio" &&
    recordings.context.sessionId === sessionId;
  const isAnyRecording = recordings.isRecording;

  const start = useCallback(async () => {
    if (!sessionId) return;
    if (recordings.isRecording) {
      const ownedByThis =
        recordings.context?.kind === "studio" &&
        recordings.context.sessionId === sessionId;
      toast.error(
        ownedByThis
          ? "Already recording this session."
          : "Another recording is in progress. Stop it first.",
      );
      return;
    }
    // Mark the session row as recording immediately for responsive UI.
    void dispatch(startSessionRecordingThunk({ id: sessionId }));
    const args: StartRecordingArgs = {
      context: { kind: "studio", sessionId },
      onChunkComplete: (info) => {
        if (!info.text.trim()) return;
        void dispatch(ingestRawChunkThunk({ sessionId, info }));
      },
      onError: (msg) => {
        toast.error(msg);
      },
    };
    try {
      await recording.start(args);
    } catch {
      // recording.start already surfaced via onError; nothing to do.
    }
  }, [
    sessionId,
    recording,
    dispatch,
    recordings.isRecording,
    recordings.context,
  ]);

  const stop = useCallback(() => {
    if (!sessionId) return;
    if (!isOwnedRecording) return;
    const totalDurationMs = Math.round((recordings.durationSec ?? 0) * 1000);
    recording.stop();
    void dispatch(
      stopSessionRecordingThunk({ id: sessionId, totalDurationMs }),
    );
  }, [
    sessionId,
    isOwnedRecording,
    recording,
    recordings.durationSec,
    dispatch,
  ]);

  const pause = useCallback(() => {
    if (!isOwnedRecording) return;
    recording.pause();
  }, [isOwnedRecording, recording]);

  const resume = useCallback(() => {
    if (!isOwnedRecording) return;
    recording.resume();
  }, [isOwnedRecording, recording]);

  return useMemo(
    () => ({
      isOwnedRecording,
      isAnyRecording,
      isPaused: recordings.isPaused,
      audioLevel: recordings.audioLevel,
      durationSec: recordings.durationSec,
      start,
      stop,
      pause,
      resume,
      lastError: recordings.lastError,
    }),
    [
      isOwnedRecording,
      isAnyRecording,
      recordings.isPaused,
      recordings.audioLevel,
      recordings.durationSec,
      recordings.lastError,
      start,
      stop,
      pause,
      resume,
    ],
  );
}
