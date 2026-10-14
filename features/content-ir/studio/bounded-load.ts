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

import { useEffect, useRef } from "react";

export const SHAPE_LOAD_DEADLINE_MS = 20_000;

/** Backoff while a load stays failed; the last entry repeats (bounded, never a storm). */
export const RECONNECT_RETRY_DELAYS_MS: readonly number[] = [5_000, 15_000, 30_000, 60_000];

export function loadTimeoutError(what: string, ms: number): Error {
  const error = new Error(
    `Loading ${what} took longer than ${Math.round(ms / 1000)} seconds. The connection may be down.`,
  );
  error.name = "TimeoutError";
  return error;
}

export function isLoadTimeoutError(error: unknown): boolean {
  return error instanceof Error && error.name === "TimeoutError";
}

/**
 * Settle with `work`, or reject with a named `TimeoutError` after `ms`.
 * The underlying request is not cancelled (not every loader takes a signal);
 * a late answer is simply ignored by the caller's own superseded-load guard.
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
    if (stopped) return;
    const delay = delays[Math.min(attempt, delays.length - 1)] ?? 60_000;
    handle = env.setTimer(fire, delay);
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
