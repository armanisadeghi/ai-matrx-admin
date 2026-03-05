/**
 * useChunkedRecordAndTranscribe
 *
 * Solves the data-loss problem with long recordings.
 *
 * How it works:
 *   - Every `chunkDurationMs` (default 10 s) the MediaRecorder is rotated: the
 *     current recording is snapped off as a complete audio blob, a fresh
 *     MediaRecorder starts on the same live stream, and the blob is sent to the
 *     transcription API in the background.
 *   - Each chunk is ≤ ~20 KB (webm/opus 16 kHz) — nowhere near the 4 MB Next.js
 *     body limit or the 25 MB Groq limit.
 *   - Results are accumulated in order into `liveTranscript`, which re-renders on
 *     every chunk so the UI always shows progress.
 *   - When the user stops, the last partial chunk is transcribed, all pending
 *     requests drain, and `onTranscriptionComplete` fires exactly once with the
 *     full accumulated text.
 *
 * Replaces useRecordAndTranscribe for any component where long recordings matter.
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { TranscriptionOptions, TranscriptionResult } from '../types';
import { getErrorSolution } from '../utils/microphone-diagnostics';

export interface UseChunkedRecordAndTranscribeProps {
  onTranscriptionComplete?: (result: TranscriptionResult) => void;
  /** Called after each individual chunk is transcribed, with the new snippet and full accumulated text. */
  onChunkTranscribed?: (chunkText: string, accumulatedText: string) => void;
  onError?: (error: string, errorCode?: string) => void;
  /** How many ms of audio to transcribe per background chunk. Default 10 000 ms (10 s). */
  chunkDurationMs?: number;
  transcriptionOptions?: TranscriptionOptions;
}

export function useChunkedRecordAndTranscribe({
  onTranscriptionComplete,
  onChunkTranscribed,
  onError,
  chunkDurationMs = 10_000,
  transcriptionOptions,
}: UseChunkedRecordAndTranscribeProps = {}) {
  const [isRecording, setIsRecording]     = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isPaused, setIsPaused]           = useState(false);
  const [duration, setDuration]           = useState(0);
  const [audioLevel, setAudioLevel]       = useState(0);
  const [liveTranscript, setLiveTranscript] = useState('');

  // ── refs (stable across renders) ────────────────────────────────────────
  const streamRef          = useRef<MediaStream | null>(null);
  const mediaRecorderRef   = useRef<MediaRecorder | null>(null);
  const accumulatedRef     = useRef('');
  const pendingRef         = useRef(0);            // in-flight transcription count
  const isStoppingRef      = useRef(false);
  const mimeTypeRef        = useRef('audio/webm');
  const rotationTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef       = useRef(0);
  const pausedAtRef        = useRef(0);            // wall-clock timestamp when last paused
  const pausedDurationRef  = useRef(0);            // total ms spent paused
  const audioCtxRef        = useRef<AudioContext | null>(null);
  const analyserRef        = useRef<AnalyserNode | null>(null);
  const rafRef             = useRef<number | null>(null);

  // ── stable callback refs so closures don't go stale ─────────────────────
  const onTranscriptionCompleteRef = useRef(onTranscriptionComplete);
  const onChunkTranscribedRef      = useRef(onChunkTranscribed);
  const onErrorRef                 = useRef(onError);
  const transcriptionOptionsRef    = useRef(transcriptionOptions);
  useEffect(() => { onTranscriptionCompleteRef.current = onTranscriptionComplete; }, [onTranscriptionComplete]);
  useEffect(() => { onChunkTranscribedRef.current = onChunkTranscribed; }, [onChunkTranscribed]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { transcriptionOptionsRef.current = transcriptionOptions; }, [transcriptionOptions]);

  // ── full cleanup ─────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    if (rotationTimerRef.current)  { clearInterval(rotationTimerRef.current);  rotationTimerRef.current  = null; }
    if (durationTimerRef.current)  { clearInterval(durationTimerRef.current);  durationTimerRef.current  = null; }
    if (rafRef.current)            { cancelAnimationFrame(rafRef.current);      rafRef.current            = null; }
    if (audioCtxRef.current?.state !== 'closed') {
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    mediaRecorderRef.current = null;
    setAudioLevel(0);
    setIsPaused(false);
    pausedAtRef.current       = 0;
    pausedDurationRef.current = 0;
    isStoppingRef.current = false;
  }, []);

  useEffect(() => () => { cleanup(); }, [cleanup]);

  // ── fire final callback when all pending transcriptions are done ─────────
  const maybeFireFinal = useCallback(() => {
    if (isStoppingRef.current && pendingRef.current === 0) {
      setIsTranscribing(false);
      const text = accumulatedRef.current.trim();
      onTranscriptionCompleteRef.current?.({ success: true, text });
    }
  }, []);

  // ── transcribe a single blob chunk ───────────────────────────────────────
  const transcribeBlob = useCallback(async (blob: Blob) => {
    // Skip blobs that are too tiny to contain real audio (< 1 KB)
    if (blob.size < 1024) {
      maybeFireFinal();
      return;
    }

    pendingRef.current += 1;
    setIsTranscribing(true);

    try {
      const opts = transcriptionOptionsRef.current;
      const ext  = blob.type.includes('webm') ? 'webm' : 'wav';
      const form = new FormData();
      form.append('file', new File([blob], `chunk.${ext}`, { type: blob.type }));
      if (opts?.language) form.append('language', opts.language);
      if (opts?.prompt)   form.append('prompt',   opts.prompt);

      const res  = await fetch('/api/audio/transcribe', { method: 'POST', body: form });
      const data = await res.json();

      if (res.ok && data.success && data.text?.trim()) {
        const snippet = (data.text as string).trim();
        const sep     = accumulatedRef.current.length > 0 ? ' ' : '';
        accumulatedRef.current += sep + snippet;
        const full = accumulatedRef.current;
        setLiveTranscript(full);
        onChunkTranscribedRef.current?.(snippet, full);
      }
    } catch (err) {
      console.error('[chunked-transcription] chunk failed:', err);
      // Don't surface individual chunk errors — the live transcript just won't
      // include this segment. A retry strategy can be added here if needed.
    } finally {
      pendingRef.current -= 1;
      maybeFireFinal();
    }
  }, [maybeFireFinal]);

  // ── create a fresh MediaRecorder on the existing stream ──────────────────
  // Each instance has its own chunk array (closure) to avoid shared-ref races.
  const createRecorder = useCallback((stream: MediaStream): MediaRecorder => {
    const mime   = mimeTypeRef.current;
    const chunks: Blob[] = [];
    const mr     = new MediaRecorder(stream, { mimeType: mime });

    mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    mr.onstop          = ()  => {
      const blob = new Blob(chunks, { type: mime });
      transcribeBlob(blob);
    };

    mr.start(100); // emit data every 100 ms for smooth chunk collection
    return mr;
  }, [transcribeBlob]);

  // ── rotate: snap current recording, immediately start fresh ─────────────
  const rotateChunk = useCallback(() => {
    if (!streamRef.current || !mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state !== 'recording')  return;

    // Stop current recorder (triggers onstop → transcribeBlob)
    mediaRecorderRef.current.stop();
    // Start a new one immediately — seamless continuation
    mediaRecorderRef.current = createRecorder(streamRef.current);
  }, [createRecorder]);

  // ── start audio level analysis (reusable for resume) ────────────────────
  const startAudioAnalysis = useCallback(() => {
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
    const tick = () => {
      if (!analyserRef.current) return;
      const buf = new Uint8Array(analyserRef.current.frequencyBinCount);
      analyserRef.current.getByteFrequencyData(buf);
      const avg = buf.reduce((a, b) => a + b, 0) / buf.length;
      setAudioLevel(Math.min(100, (avg / 255) * 150));
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  // ── start duration timer (reusable for resume) ───────────────────────────
  const startDurationTimer = useCallback(() => {
    if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }
    durationTimerRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current - pausedDurationRef.current) / 1000));
    }, 100);
  }, []);

  // ── start ────────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      isStoppingRef.current  = false;
      accumulatedRef.current = '';
      pendingRef.current     = 0;
      setLiveTranscript('');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl:  true,
          sampleRate:       16_000,
        },
      });
      streamRef.current = stream;

      // Audio level analysis for visual feedback
      audioCtxRef.current  = new AudioContext();
      analyserRef.current  = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize               = 256;
      analyserRef.current.smoothingTimeConstant = 0.8;
      audioCtxRef.current.createMediaStreamSource(stream).connect(analyserRef.current);

      startAudioAnalysis();

      mimeTypeRef.current = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      mediaRecorderRef.current = createRecorder(stream);

      setIsRecording(true);
      startTimeRef.current      = Date.now();
      pausedDurationRef.current = 0;

      startDurationTimer();

      // Chunk rotation — each interval produces one transcription request
      rotationTimerRef.current = setInterval(rotateChunk, chunkDurationMs);

    } catch (err) {
      const sol = getErrorSolution(err);
      onErrorRef.current?.(sol.message, sol.code);
      cleanup();
    }
  }, [cleanup, startAudioAnalysis, startDurationTimer, createRecorder, rotateChunk, chunkDurationMs]);

  // ── stop ─────────────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    isStoppingRef.current = true;

    if (rotationTimerRef.current)  { clearInterval(rotationTimerRef.current);   rotationTimerRef.current  = null; }
    if (durationTimerRef.current)  { clearInterval(durationTimerRef.current);   durationTimerRef.current  = null; }
    if (rafRef.current)            { cancelAnimationFrame(rafRef.current);       rafRef.current            = null; }
    if (audioCtxRef.current?.state !== 'closed') {
      audioCtxRef.current?.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setIsPaused(false);
    setAudioLevel(0);
    pausedDurationRef.current = 0;

    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      // Recorder already stopped or never started — fire final immediately
      mediaRecorderRef.current = null;
      if (pendingRef.current === 0) {
        setIsTranscribing(false);
        const text = accumulatedRef.current.trim();
        onTranscriptionCompleteRef.current?.({ success: true, text });
      }
      return;
    }

    // Stop the active recorder — its onstop will call transcribeBlob, which
    // calls maybeFireFinal when pendingRef reaches 0.
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
  }, []);

  // ── pause ────────────────────────────────────────────────────────────────
  const pauseRecording = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') return;
    mediaRecorderRef.current.pause();
    pausedAtRef.current = Date.now();

    if (rotationTimerRef.current) { clearInterval(rotationTimerRef.current); rotationTimerRef.current = null; }
    if (durationTimerRef.current) { clearInterval(durationTimerRef.current); durationTimerRef.current = null; }
    if (rafRef.current)           { cancelAnimationFrame(rafRef.current);    rafRef.current = null; }
    setAudioLevel(0);
    setIsPaused(true);
  }, []);

  // ── resume ───────────────────────────────────────────────────────────────
  const resumeRecording = useCallback(() => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'paused') return;
    pausedDurationRef.current += Date.now() - pausedAtRef.current;
    mediaRecorderRef.current.resume();
    startAudioAnalysis();
    startDurationTimer();
    rotationTimerRef.current = setInterval(rotateChunk, chunkDurationMs);
    setIsPaused(false);
  }, [startAudioAnalysis, startDurationTimer, rotateChunk, chunkDurationMs]);

  // ── reset ────────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    cleanup();
    setIsRecording(false);
    setIsTranscribing(false);
    setDuration(0);
    setAudioLevel(0);
    setLiveTranscript('');
    accumulatedRef.current = '';
    pendingRef.current     = 0;
  }, [cleanup]);

  return {
    isRecording,
    isTranscribing,
    isPaused,
    duration,
    audioLevel,
    /** Updates in real-time as each 10-second chunk comes back from the API. */
    liveTranscript,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    reset,
  };
}
