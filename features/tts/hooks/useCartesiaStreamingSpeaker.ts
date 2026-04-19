/**
 * useCartesiaStreamingSpeaker
 *
 * Drop-in streaming variant of useCartesiaSpeaker. Public API is identical:
 *
 *   const { speak, pause, resume, stop, phase, isLoading, isPlaying, isPaused }
 *     = useCartesiaStreamingSpeaker({ processMarkdown });
 *
 * Key differences from the non-streaming hook:
 *
 *   1. **Progressive send.** Input text is split into sentence-scale chunks.
 *      The first chunk is tiny (~160 chars) — time-to-first-audio is dominated
 *      by Cartesia's generation latency on the FIRST send, so we keep that send
 *      as small as possible. Subsequent chunks (up to ~400 chars each) stream
 *      into the SAME audio source via `ws.continue({ contextId, ... })`.
 *
 *   2. **Shared WebPlayer source.** The WebSocket response from the first send
 *      returns a single `source`. Every follow-up `ws.continue` pushes more
 *      audio chunks into that same source. The player begins playback as soon
 *      as the first byte arrives — we never await full generation.
 *
 *   3. **SDK lazy-load.** The @cartesia/cartesia-js SDK is imported dynamically
 *      inside `ensureConnection()`. Mounting this hook does NOT pull the SDK
 *      into the bundle — only calling `speak()` does. The consumer component
 *      should still use its own lazy shell (React.lazy / next/dynamic) so the
 *      hook itself isn't even evaluated until the user clicks play.
 *
 *   4. **Abortable.** Each speak session gets an AbortController. stop() aborts
 *      any in-flight continue sends, closes the source, stops the player.
 *
 * Public surface and return type match useCartesiaSpeaker so existing consumers
 * can swap with no further changes.
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppSelector } from '@/lib/redux/hooks';
import { parseMarkdownToText } from '@/utils/markdown-processors/parse-markdown-for-speech';
import { toast } from 'sonner';
import { chunkTextForSpeech } from '../utils/chunk-text-for-speech';

// Opaque types — we never inspect these at runtime, only pass them through.
// Imported as `type` so TypeScript pulls the shape but the runtime bundle
// does NOT eagerly require the SDK.
import type { CartesiaClient as CartesiaClientType, WebPlayer as WebPlayerType } from '@cartesia/cartesia-js';

export type SpeakerPhase =
  | 'idle'
  | 'fetching-token'
  | 'connecting'
  | 'sending'
  | 'playing'
  | 'paused'
  | 'error';

export interface UseCartesiaStreamingSpeakerOptions {
  processMarkdown?: boolean;
  /** Override the small-first-chunk size (default 160 chars). */
  firstChunkMax?: number;
  /** Override the subsequent-chunk size (default 400 chars). */
  nextChunkMax?: number;
}

type CartesiaWs = ReturnType<CartesiaClientType['tts']['websocket']>;

export function useCartesiaStreamingSpeaker(
  {
    processMarkdown = true,
    firstChunkMax,
    nextChunkMax,
  }: UseCartesiaStreamingSpeakerOptions = {},
) {
  const [phase, setPhase] = useState<SpeakerPhase>('idle');

  const websocketRef = useRef<CartesiaWs | null>(null);
  const playerRef = useRef<WebPlayerType | null>(null);
  const hasPlayedRef = useRef(false);
  const mountedRef = useRef(true);
  /** AbortController for the current speak session. */
  const sessionRef = useRef<AbortController | null>(null);

  /** SDK module, lazily imported on first speak() call. */
  const sdkRef = useRef<typeof import('@cartesia/cartesia-js') | null>(null);

  const voicePrefs = useAppSelector((s) => s.userPreferences.voice);
  const voiceId = voicePrefs.voice || '156fb8d2-335b-4950-9cb3-a2d33befec77';
  const language = voicePrefs.language || 'en';
  const speed = voicePrefs.speed || 0;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sessionRef.current?.abort();
      sessionRef.current = null;
      if (websocketRef.current) {
        try {
          websocketRef.current.disconnect();
        } catch {
          /* ignore */
        }
        websocketRef.current = null;
      }
      if (playerRef.current && hasPlayedRef.current) {
        playerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const setPhaseIfMounted = useCallback((p: SpeakerPhase) => {
    if (mountedRef.current) setPhase(p);
  }, []);

  /**
   * Ensures the Cartesia SDK is loaded, a token is fetched, and the WebSocket
   * is connected. Idempotent — cheap on subsequent calls once established.
   * The SDK import is the expensive step; it only happens on the very first
   * call across the hook's lifetime.
   */
  const ensureConnection = useCallback(async () => {
    if (websocketRef.current) return;

    if (!sdkRef.current) {
      // Dynamic import keeps the ~30KB Cartesia SDK out of the initial
      // bundle. It only loads when the user actually clicks play.
      sdkRef.current = await import('@cartesia/cartesia-js');
    }

    setPhaseIfMounted('fetching-token');
    let tokenData: { token: string };
    try {
      const res = await fetch('/api/cartesia');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Token fetch failed: ${res.status}`);
      }
      tokenData = await res.json();
    } catch (err) {
      setPhaseIfMounted('error');
      throw err;
    }

    setPhaseIfMounted('connecting');
    try {
      const { CartesiaClient } = sdkRef.current;
      const client = new CartesiaClient();
      const ws = client.tts.websocket({
        container: 'raw',
        encoding: 'pcm_f32le',
        sampleRate: 44100,
      });

      const ctx = await ws.connect({ accessToken: tokenData.token });
      ctx.on('close', () => {
        websocketRef.current = null;
        setPhaseIfMounted('idle');
      });

      websocketRef.current = ws;
    } catch (err) {
      setPhaseIfMounted('error');
      throw err;
    }
  }, [setPhaseIfMounted]);

  const ensurePlayer = useCallback(() => {
    if (playerRef.current || !sdkRef.current) return;
    const { WebPlayer } = sdkRef.current;
    // bufferDuration 0.1 — start playing as soon as ~100ms of audio has
    // arrived. Lower = faster start, but too low risks underruns if the
    // network hiccups. 0.1 is a good balance for Cartesia's sub-300ms TTFB.
    playerRef.current = new WebPlayer({ bufferDuration: 0.1 });
  }, []);

  /**
   * Speak the given text with progressive streaming. Any prior speak() session
   * is cancelled first so the latest click always wins.
   */
  const speak = useCallback(
    async (inputText: string) => {
      const processed = processMarkdown
        ? parseMarkdownToText(inputText)
        : inputText;
      if (!processed.trim()) {
        toast.error('Nothing to speak');
        return;
      }

      // Cancel any prior session and start a new one.
      sessionRef.current?.abort();
      const session = new AbortController();
      sessionRef.current = session;

      try {
        await ensureConnection();
        if (session.signal.aborted) return;
        ensurePlayer();

        setPhaseIfMounted('sending');

        const chunks = chunkTextForSpeech(processed, {
          lang: language,
          firstChunkMax,
          nextChunkMax,
        });
        if (chunks.length === 0) {
          setPhaseIfMounted('idle');
          return;
        }

        const contextId = cryptoRandomId();
        const baseRequest = {
          modelId: 'sonic-3',
          voice: {
            mode: 'id' as const,
            id: voiceId,
            experimentalControls: { speed, emotion: [] },
          },
          language,
          contextId,
        };

        const ws = websocketRef.current!;
        const player = playerRef.current!;

        // First send — creates the context and returns the streaming source.
        const firstResp = await ws.send({
          ...baseRequest,
          transcript: chunks[0],
          continue: chunks.length > 1,
        });

        if (session.signal.aborted) return;

        hasPlayedRef.current = true;
        setPhaseIfMounted('playing');

        // Fire-and-forget: play resolves when the source closes (all audio
        // consumed). Errors surface via the catch below.
        const playPromise = player.play(firstResp.source).catch((err: unknown) => {
          if (!session.signal.aborted) {
            console.error('[useCartesiaStreamingSpeaker] play failed:', err);
          }
        });

        // Stream the rest of the chunks into the same context. Each continue
        // is tiny on the wire — the server has already started generating.
        for (let i = 1; i < chunks.length; i++) {
          if (session.signal.aborted) return;
          await ws.continue({
            ...baseRequest,
            transcript: chunks[i],
            continue: i < chunks.length - 1,
          });
        }

        // Wait for playback to drain.
        await playPromise;

        if (!session.signal.aborted) setPhaseIfMounted('idle');
      } catch (err) {
        if (session.signal.aborted) return;
        const msg = err instanceof Error ? err.message : 'Speech failed';
        console.error('[useCartesiaStreamingSpeaker]', msg);
        toast.error('Speech playback failed', { description: msg });
        setPhaseIfMounted('error');
      }
    },
    [
      processMarkdown,
      voiceId,
      language,
      speed,
      firstChunkMax,
      nextChunkMax,
      ensureConnection,
      ensurePlayer,
      setPhaseIfMounted,
    ],
  );

  const pause = useCallback(async () => {
    if (playerRef.current && phase === 'playing') {
      try {
        await playerRef.current.pause();
        setPhaseIfMounted('paused');
      } catch (err) {
        console.error('[useCartesiaStreamingSpeaker] pause failed:', err);
        setPhaseIfMounted('idle');
      }
    }
  }, [phase, setPhaseIfMounted]);

  const resume = useCallback(async () => {
    if (playerRef.current && phase === 'paused') {
      try {
        await playerRef.current.resume();
        setPhaseIfMounted('playing');
      } catch (err) {
        console.error('[useCartesiaStreamingSpeaker] resume failed:', err);
        setPhaseIfMounted('idle');
      }
    }
  }, [phase, setPhaseIfMounted]);

  const stop = useCallback(async () => {
    sessionRef.current?.abort();
    sessionRef.current = null;
    if (playerRef.current && hasPlayedRef.current) {
      try {
        await playerRef.current.stop();
      } catch (err) {
        console.error('[useCartesiaStreamingSpeaker] stop failed:', err);
      }
    }
    setPhaseIfMounted('idle');
  }, [setPhaseIfMounted]);

  const isLoading =
    phase === 'fetching-token' || phase === 'connecting' || phase === 'sending';
  const isPlaying = phase === 'playing';
  const isPaused = phase === 'paused';

  return {
    phase,
    isLoading,
    isPlaying,
    isPaused,
    speak,
    pause,
    resume,
    stop,
  };
}

function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `cx_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}
