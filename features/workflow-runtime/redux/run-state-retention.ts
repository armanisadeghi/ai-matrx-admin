/**
 * Run-state retention — the `workflowRuns` slice keeps a run's whole event
 * history (tens of thousands of nodes for a big run) and used to drop it only
 * when a surface called `detachRun` by hand. A tab that ran many subjects
 * (Smart Add rounds, a board of runs, the run permalink) only ever grew
 * (MKT-165: 3.4 MB -> 16.4 MB over two runs, never released).
 *
 * THE RULE: a run no screen is watching is RELEASED — its slice state is
 * dropped — after a short retention window, and the number of released-but-
 * still-kept runs is capped. Reopening a released run adopts it again, which
 * reads the run row and replays the durable events from the database.
 *
 * "Watching" is owned by `useWorkflowRun`: it calls `scheduleRunRelease` only
 * once the adoption itself has been stopped (no holder, grace window over), and
 * `cancelRunRelease` the moment a holder adopts the run again. A run with a
 * holder is therefore never scheduled, and `releaseNow` refuses a run that
 * `isWatched` still reports — an open run is never dropped mid-stream.
 */

import type { AppDispatch } from "@/lib/redux/store";
import { detachRun } from "./workflow-runs.slice";

/** How long an unwatched run's state stays in memory before it is released
 * (on top of the 15 s adoption grace) — long enough to flip back to a run you
 * just left, short enough that a run-heavy tab stays flat. */
export const RUN_STATE_RETENTION_MS = 120_000;

/** Most unwatched runs kept at once; the oldest-released goes first. */
export const MAX_UNWATCHED_RUNS_KEPT = 2;

interface Pending {
  timer: ReturnType<typeof setTimeout>;
}

/** Per dispatch (= per store): runId -> pending release, in release order. */
const pendingByStore = new WeakMap<object, Map<string, Pending>>();

function pendingFor(dispatch: object): Map<string, Pending> {
  let m = pendingByStore.get(dispatch);
  if (!m) {
    m = new Map();
    pendingByStore.set(dispatch, m);
  }
  return m;
}

export interface RetentionOptions {
  /** True while any holder (or live adoption) still watches the run. */
  isWatched: (runId: string) => boolean;
  retentionMs?: number;
  maxKept?: number;
}

function releaseNow(
  dispatch: AppDispatch,
  runId: string,
  opts: RetentionOptions,
): void {
  const pending = pendingFor(dispatch);
  const entry = pending.get(runId);
  if (entry) clearTimeout(entry.timer);
  pending.delete(runId);
  if (opts.isWatched(runId)) return; // re-adopted: never drop an open run
  dispatch(detachRun({ runId }));
}

/** Call when a run's adoption has fully stopped (nobody watches it). */
export function scheduleRunRelease(
  dispatch: AppDispatch,
  runId: string,
  opts: RetentionOptions,
): void {
  const pending = pendingFor(dispatch);
  const prior = pending.get(runId);
  if (prior) clearTimeout(prior.timer);
  pending.delete(runId); // re-insert so Map order = most recently unwatched last
  pending.set(runId, {
    timer: setTimeout(
      () => releaseNow(dispatch, runId, opts),
      opts.retentionMs ?? RUN_STATE_RETENTION_MS,
    ),
  });
  const maxKept = opts.maxKept ?? MAX_UNWATCHED_RUNS_KEPT;
  while (pending.size > maxKept) {
    const oldest = pending.keys().next().value as string;
    releaseNow(dispatch, oldest, opts);
  }
}

/** Call when a holder adopts a run again — it is watched, so keep it. */
export function cancelRunRelease(dispatch: AppDispatch, runId: string): void {
  const pending = pendingFor(dispatch);
  const entry = pending.get(runId);
  if (!entry) return;
  clearTimeout(entry.timer);
  pending.delete(runId);
}
