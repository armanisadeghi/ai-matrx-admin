"use client";
import { useState, useRef, useCallback, useEffect, useId } from "react";
import {
  acquireMicStream,
  createStreamLevelMeter,
  releaseMicStream,
  type StreamLevelMeter,
} from "@ai-matrx/browser-audio/core";
import { claimCapture, releaseCapture } from "@/features/audio/captureLock";
import { beginRecordingSession } from "@/features/audio/session/audioSessionRegistry";
import type { PlaybackSessionHandle } from "@/features/audio/session/types";

/**
 * Multi-stream flashcard recorder, keyed by `key` so several cards can record
 * concurrently. Refactored to route through the canonical mic singleton
 * (`acquireMicStream`/`releaseMicStream`) instead of calling `getUserMedia`
 * directly and `track.stop()`-ing the stream — the old version (a) re-prompted
 * on every record (iOS) and (b) leaked the mic indicator on unmount (it had NO
 * cleanup effect). It now holds a singleton ref PER active key and releases each
 * on stop AND on unmount/error.
 */
export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  // `recordings` is exposed as STATE (not a ref read during render — that
  // tripped react-hooks/refs); it mirrors completed blobs keyed by `key`.
  const [recordings, setRecordings] = useState<Record<string, Blob>>({});
  // One package level meter per active key; the exposed level is the loudest.
  const metersRef = useRef<Record<string, StreamLevelMeter>>({});
  const levelsRef = useRef<Record<string, number>>({});
  const mediaRecordersRef = useRef<Record<string, MediaRecorder>>({});
  const audioChunksRef = useRef<Record<string, Blob[]>>({});
  // Keys for which we currently hold a singleton ref — so release is balanced
  // exactly once per acquire across stop / unmount.
  const heldKeysRef = useRef<Set<string>>(new Set());
  // Guards the acquire await: an unmount mid-getUserMedia would otherwise
  // resolve into a mic hold the unmount cleanup already missed.
  const disposedRef = useRef(false);
  // Stable id under which this hook holds the app-wide capture lock. The hook
  // multiplexes several keys onto ONE shared mic, so it presents to the lock as
  // a SINGLE holder: claimed while any key is active, released when all stop.
  const captureId = useId();
  // ONE coarse registry session for the whole practice run (this hook
  // multiplexes many cards onto one capture-lock holder, so per-card sessions
  // would flood the panel). Opened on the first active key, ended when all stop.
  const recordingSessionRef = useRef<PlaybackSessionHandle | null>(null);

  /** Stop every active MediaRecorder now — the app-wide capture lock calls this
   *  when another recorder (dictation, voice message) takes over the mic. Each
   *  recorder's onstop runs the normal teardown (stores its blob, releases). */
  const stopAllRef = useRef<() => void>(() => {});
  stopAllRef.current = () => {
    for (const recorder of Object.values(mediaRecordersRef.current)) {
      if (recorder.state === "recording") {
        try {
          recorder.stop();
        } catch {
          /* ignore */
        }
      }
    }
  };

  const releaseKey = useCallback(
    (key: string) => {
      metersRef.current[key]?.stop();
      delete metersRef.current[key];
      delete levelsRef.current[key];
      if (heldKeysRef.current.has(key)) {
        releaseMicStream();
        heldKeysRef.current.delete(key);
      }
      // Once no key is recording, the hook no longer owns capture.
      if (heldKeysRef.current.size === 0) {
        releaseCapture(captureId);
        if (recordingSessionRef.current) {
          recordingSessionRef.current.end("done");
          recordingSessionRef.current = null;
        }
      }
    },
    [captureId],
  );

  // Release EVERY outstanding hold on unmount — the whole-session
  // mic-indicator-leak guard the old hook was missing entirely.
  useEffect(() => {
    disposedRef.current = false;
    return () => {
      disposedRef.current = true;
      for (const key of Array.from(heldKeysRef.current)) {
        releaseKey(key);
      }
    };
  }, [releaseKey]);

  const startRecording = useCallback(
    async (key: string) => {
      if (!navigator.mediaDevices?.getUserMedia) return;
      try {
        // Claim the app-wide capture lock (start-always-wins). Same-id reclaim
        // for a second concurrent flashcard key is a no-op handoff; a claim by
        // ANOTHER recorder stops all our keys via stopAllRef.
        claimCapture({
          id: captureId,
          label: "Flashcard recorder",
          stop: () => stopAllRef.current(),
        });
        // Surface the practice run in the Audio panel (one session for all keys).
        if (!recordingSessionRef.current) {
          recordingSessionRef.current = beginRecordingSession({
            label: "Flashcard practice",
            controls: { stop: () => stopAllRef.current() },
          });
        }
        // Shared mic stream (chosen device + warm grant). Never stopped here.
        const stream = await acquireMicStream({ channelCount: 1 });
        if (disposedRef.current) {
          // Unmounted while gUM was pending — release the ownerless hold.
          releaseMicStream();
          return;
        }
        heldKeysRef.current.add(key);

        // The package level meter (shared AudioContext, never closed).
        metersRef.current[key] = createStreamLevelMeter(stream, (level) => {
          levelsRef.current[key] = level;
          setAudioLevel(Math.max(0, ...Object.values(levelsRef.current)));
        });

        audioChunksRef.current[key] = [];
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";
        const recorder = new MediaRecorder(stream, { mimeType });
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current[key].push(e.data);
          }
        };
        mediaRecordersRef.current[key] = recorder;
        recorder.start();
        setIsRecording(true);
      } catch (err) {
        // Release any partial hold so a failed start never leaks the mic.
        releaseKey(key);
        setIsRecording(false);
        // Don't silently swallow — surface for diagnostics.
        console.error("[useAudioRecorder] startRecording failed:", err);
      }
    },
    [releaseKey, captureId],
  );

  const stopRecording = useCallback(
    async (key: string) => {
      const recorder = mediaRecordersRef.current[key];
      if (recorder && recorder.state === "recording") {
        return new Promise<Blob | undefined>((resolve) => {
          recorder.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current[key], {
              type: "audio/webm",
            });
            setRecordings((prev) => ({ ...prev, [key]: audioBlob }));
            delete mediaRecordersRef.current[key];
            // Release the singleton hold for this key (NEVER stop tracks).
            releaseKey(key);
            if (heldKeysRef.current.size === 0) setAudioLevel(0);
            setIsRecording(heldKeysRef.current.size > 0);
            resolve(audioBlob);
          };
          recorder.stop();
        });
      }
      return undefined;
    },
    [releaseKey],
  );

  return {
    isRecording,
    audioLevel,
    startRecording,
    stopRecording,
    recordings,
  };
}
