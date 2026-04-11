"use client";

import { useRef, useState, useCallback } from "react";
import {
  StreamingJsonTracker,
  type StreamingJsonState,
  type StreamingJsonTrackerOptions,
} from "../streaming-json-tracker";

/**
 * React hook wrapper around StreamingJsonTracker.
 *
 * Usage:
 * ```tsx
 * const { state, append, finalize, reset } = useStreamingJson();
 *
 * // As chunks arrive:
 * append(chunk);
 *
 * // When stream ends:
 * finalize();
 *
 * // Read results:
 * state.results[0]?.value
 * ```
 */
export function useStreamingJson(options?: StreamingJsonTrackerOptions) {
  const trackerRef = useRef<StreamingJsonTracker | null>(null);
  const lastRevisionRef = useRef(0);

  if (!trackerRef.current) {
    trackerRef.current = new StreamingJsonTracker(options);
  }

  const [state, setState] = useState<StreamingJsonState>(
    trackerRef.current.getState(),
  );

  const maybeUpdate = useCallback((next: StreamingJsonState) => {
    if (next.revision !== lastRevisionRef.current) {
      lastRevisionRef.current = next.revision;
      setState(next);
    }
  }, []);

  const append = useCallback(
    (chunk: string) => {
      const next = trackerRef.current!.append(chunk);
      maybeUpdate(next);
    },
    [maybeUpdate],
  );

  const setFullText = useCallback(
    (text: string) => {
      const next = trackerRef.current!.setFullText(text);
      maybeUpdate(next);
    },
    [maybeUpdate],
  );

  const finalize = useCallback(() => {
    const next = trackerRef.current!.finalize();
    lastRevisionRef.current = next.revision;
    setState(next);
  }, []);

  const reset = useCallback(() => {
    trackerRef.current!.reset();
    lastRevisionRef.current = 0;
    setState(trackerRef.current!.getState());
  }, []);

  return { state, append, setFullText, finalize, reset };
}
