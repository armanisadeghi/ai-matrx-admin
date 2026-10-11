"use client";

/**
 * The fetches in flight, held OUTSIDE any tile body: a body that sleeps, unmounts or is left (the
 * person opens another page and comes back) re-attaches to the same run by its key. After a reload
 * the run is gone from memory and the tile reconnects through its saved job id (`GET /jobs/{id}`).
 */

import { useSyncExternalStore } from "react";

import { DataFetchRefusal, type DataFetchProgress, type DataFetchResult, type DataJobState } from "./contract";

export type RunState =
  | { status: "idle" }
  | { status: "running"; progress: DataFetchProgress | null; startedAt: number }
  | { status: "done"; result: DataFetchResult }
  | { status: "failed"; refusal: DataFetchRefusal };

const IDLE: RunState = { status: "idle" };
const runs = new Map<string, RunState>();
const listeners = new Map<string, Set<() => void>>();

function set(key: string, state: RunState) {
  runs.set(key, state);
  listeners.get(key)?.forEach((l) => l());
}

export function runState(key: string): RunState {
  return runs.get(key) ?? IDLE;
}

export function useRun(key: string): RunState {
  return useSyncExternalStore(
    (cb) => {
      const set = listeners.get(key) ?? new Set();
      set.add(cb);
      listeners.set(key, set);
      return () => set.delete(cb);
    },
    () => runState(key),
    () => IDLE,
  );
}

export function clearRun(key: string) {
  set(key, IDLE);
}

const asRefusal = (err: unknown): DataFetchRefusal =>
  err instanceof DataFetchRefusal
    ? err
    : new DataFetchRefusal("data_fetch_failed", err instanceof Error && err.message ? err.message : "The fetch failed.");

/** Start a run under `key` (one at a time per key). `work` reports progress; its answer ends the run. */
export function startRun(
  key: string,
  work: (onProgress: (p: DataFetchProgress) => void) => Promise<DataFetchResult>,
  onDone?: (result: DataFetchResult) => void,
): void {
  if (runState(key).status === "running") return;
  const startedAt = Date.now();
  set(key, { status: "running", progress: null, startedAt });
  work((progress) => set(key, { status: "running", progress, startedAt }))
    .then((result) => {
      set(key, { status: "done", result });
      onDone?.(result);
    })
    .catch((err: unknown) => {
      set(key, { status: "failed", refusal: asRefusal(err) });
    });
}

const POLL_MS = 4000;

/** Reconnect to a saved job (after a reload): poll until it ends. Abort with the signal. */
export function resumeRun(
  key: string,
  read: (signal: AbortSignal) => Promise<DataJobState>,
  onDone?: (result: DataFetchResult) => void,
): () => void {
  const ctl = new AbortController();
  if (runState(key).status === "running") return () => ctl.abort();
  const startedAt = Date.now();
  set(key, { status: "running", progress: null, startedAt });
  const tick = async () => {
    if (ctl.signal.aborted) return;
    try {
      const job = await read(ctl.signal);
      if (ctl.signal.aborted) return;
      if (job.state === "done") {
        set(key, { status: "done", result: job.result });
        onDone?.(job.result);
        return;
      }
      if (job.state === "failed") {
        set(key, { status: "failed", refusal: job.refusal });
        return;
      }
      set(key, { status: "running", progress: job.progress, startedAt });
      setTimeout(() => void tick(), POLL_MS);
    } catch (err) {
      if (ctl.signal.aborted) return;
      set(key, { status: "failed", refusal: asRefusal(err) });
    }
  };
  void tick();
  return () => {
    ctl.abort();
    if (runState(key).status === "running") set(key, IDLE);
  };
}
