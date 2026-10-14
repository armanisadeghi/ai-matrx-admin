"use client";

/**
 * BOUNDED LOADS FOR THE SHAPE PAGES (Arman, 2026-10-14, live /shapes/brand_intake_facts).
 *
 * 🚨 WHY. When the browser's line to the database stalls, every Supabase read
 * fails together with `TypeError: Failed to fetch` after ~20s — and postgrest-js
 * retries a failed GET three more times (1s/2s/4s), so ONE read can sit ~90s
 * before it says anything. The page's loaders (examples, sightings, component
 * candidates, "what renders this shape") each waited on that, so the preview
 * spun for minutes, the resolver's own retries kept filing errors, and when the
 * line came back nothing re-asked: the failure state stayed forever.
 *
 * Two small pieces, shared by every loader on the shape pages:
 *  - {@link withLoadDeadline}: a bounded wait that ends in a NAMED
 *    `TimeoutError` (the file library's `file-tree-timeout.ts` is the model).
 *  - {@link useReconnectRetry}: while a load is in the failed state, ask again
 *    on `online`, when the tab becomes visible, and on a bounded backoff — so
 *    a failure is an honest state that heals itself, never a dead end.
 */

import { useCallback, useEffect, useRef } from "react";
import { formatDurationMs } from "@ai-matrx/kit/format";

export const SHAPE_LOAD_DEADLINE_MS = 20_000;

/**
 * Timer retries while a load stays failed. FINITE on purpose: after the last
 * one only a real signal (`online`, tab visible, a click) retries, so a long
 * outage cannot grow the error count forever.
 */
export const RECONNECT_RETRY_DELAYS_MS: readonly number[] = [5_000, 15_000, 30_000, 60_000];

export function loadTimeoutError(what: string, ms: number): Error {
  const error = new Error(`No answer for ${what} after ${formatDurationMs(ms, { style: "compact" })}`);
  error.name = "TimeoutError";
  return error;
}

/** A failure that means "the line is down", not "the database refused" (timeout or a failed fetch). */
export function isConnectionFailure(error: unknown): boolean {
  if (isLoadTimeoutError(error)) return true;
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /failed to fetch|networkerror|load failed|network request failed/i.test(text);
}

export function isLoadTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.name === "TimeoutError";
}

/**
 * Settle with `work`, or reject with a named `TimeoutError` after `ms`.
 * The underlying request is not cancelled (not every loader takes a signal);
 * a late answer is ignored by the caller's {@link useLoadSequence} guard.
 */
export function withLoadDeadline<T>(
  work: Promise<T>,
  what: string,
  ms: number = SHAPE_LOAD_DEADLINE_MS,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(loadTimeoutError(what, ms)), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export interface ReconnectRetryEnv {
  /** Listens for `online`. Returns an unsubscribe. */
  onOnline: (listener: () => void) => () => void;
  /** Listens for the tab becoming visible. Returns an unsubscribe. */
  onVisible: (listener: () => void) => () => void;
  setTimer: (fn: () => void, ms: number) => unknown;
  clearTimer: (handle: unknown) => void;
}

const browserEnv: ReconnectRetryEnv = {
  onOnline: (listener) => {
    window.addEventListener("online", listener);
    return () => window.removeEventListener("online", listener);
  },
  onVisible: (listener) => {
    const handler = () => {
      if (document.visibilityState === "visible") listener();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  },
  setTimer: (fn, ms) => setTimeout(fn, ms),
  clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/**
 * Start retrying `retry` on reconnect signals and a bounded backoff.
 * Returns `stop`. Pure of React so it can be tested without a renderer.
 */
export function startReconnectRetry(
  retry: () => void,
  env: ReconnectRetryEnv = browserEnv,
  delays: readonly number[] = RECONNECT_RETRY_DELAYS_MS,
): () => void {
  let attempt = 0;
  let handle: unknown = null;
  let stopped = false;

  const fire = () => {
    if (stopped) return;
    if (handle !== null) env.clearTimer(handle);
    handle = null;
    attempt += 1;
    retry();
    schedule();
  };
  const schedule = () => {
    if (stopped || attempt >= delays.length) return;
    handle = env.setTimer(fire, delays[attempt]!);
  };

  const offOnline = env.onOnline(fire);
  const offVisible = env.onVisible(fire);
  schedule();

  return () => {
    stopped = true;
    if (handle !== null) env.clearTimer(handle);
    offOnline();
    offVisible();
  };
}

/**
 * While `failed`, keep asking again (see {@link startReconnectRetry}). When
 * `failed` flips false — the load landed — the retrying stops by itself.
 */
export function useReconnectRetry(failed: boolean, retry: () => void): void {
  const retryRef = useRef(retry);
  useEffect(() => {
    retryRef.current = retry;
  });
  useEffect(() => {
    if (!failed) return;
    return startReconnectRetry(() => retryRef.current());
  }, [failed]);
}

/**
 * Latest-call-wins guard. `const isCurrent = begin()` at the start of a load;
 * after every await, `if (!isCurrent()) return` — an older call's late success
 * or late timeout can never overwrite a newer retry's result. Unmount makes
 * every outstanding call stale.
 */
export function useLoadSequence(): () => () => boolean {
  const seq = useRef(0);
  useEffect(() => {
    const ref = seq;
    return () => {
      ref.current += 1;
    };
  }, []);
  return useCallback(() => {
    const mine = ++seq.current;
    return () => mine === seq.current;
  }, []);
}

/**
 * True the first time it is called per outage and false for every retry after
 * it; `reset()` when the load lands. Retries of one outage file ONE error.
 */
export function useOncePerOutage(): { first: () => boolean; reset: () => void } {
  const reported = useRef(false);
  return {
    first: () => {
      if (reported.current) return false;
      reported.current = true;
      return true;
    },
    reset: () => {
      reported.current = false;
    },
  };
}
