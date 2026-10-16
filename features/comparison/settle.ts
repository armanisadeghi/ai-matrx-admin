/**
 * Settle a comparison stream against its durable run — the comparison twin of
 * `features/data-sources/settle.ts` (same rule, the run instead of the job):
 *   - the run id is the stream's FIRST event (`comparison_run`), written before anything is fetched;
 *   - while the stream is open the run is also read, so a stream that goes quiet still resolves;
 *   - when the stream throws (anything but a refusal the server sent) or ends without an answer,
 *     the run is read until it is done, and ITS result is the answer.
 * Only a stream that dropped before the run id arrived has nothing to recover and rethrows.
 * `recoverRun` is the same reading loop for a page opened on `?run=<id>` (a refresh, a new tab).
 */

import {
  ComparisonRefusal,
  readEvent,
  type ComparisonProgress,
  type ComparisonResult,
  type ComparisonRunState,
} from "./contract";

export interface RunWatch {
  /** The durable id, the moment it is known (put it in the address bar). */
  onRunId?: (runId: string, labels: string[]) => void;
  onProgress?: (p: ComparisonProgress) => void;
  /** Every read of the run row (progress after a drop, per-item stages). */
  onRunState?: (s: ComparisonRunState) => void;
  /** The live stream was cut after the run id arrived; the saved run carries on from here. */
  onDropped?: () => void;
}

export interface SettleOptions extends RunWatch {
  events: AsyncIterable<unknown>;
  readRun: (runId: string, signal: AbortSignal) => Promise<ComparisonRunState>;
  signal?: AbortSignal;
  stopStream?: () => void;
  pollMs?: number;
}

export const SETTLE_POLL_MS = 6000;

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(t); resolve(); }, { once: true });
  });

function fromRun(run: ComparisonRunState): ComparisonResult | null {
  if (run.status === "done" && run.result) return run.result;
  if (run.status === "failed") {
    throw new ComparisonRefusal(run.error_code ?? "comparison_failed", run.user_message ?? "The comparison could not be finished.");
  }
  return null;
}

/** Read a run until it ends; its result is the answer. Transient read failures keep reading. */
export async function pollRun(
  runId: string,
  opts: { readRun: SettleOptions["readRun"]; signal: AbortSignal; pollMs?: number; immediate?: boolean } & RunWatch,
): Promise<ComparisonResult> {
  const pollMs = opts.pollMs ?? SETTLE_POLL_MS;
  let first = opts.immediate === true;
  for (;;) {
    if (!first) await sleep(pollMs, opts.signal);
    first = false;
    if (opts.signal.aborted) throw new ComparisonRefusal("comparison_cancelled", "The comparison was stopped.");
    try {
      const run = await opts.readRun(runId, opts.signal);
      opts.onRunState?.(run);
      const done = fromRun(run);
      if (done) return done;
    } catch (err) {
      if (err instanceof ComparisonRefusal && !err.code.startsWith("http_5") && err.code !== "network") throw err;
      // a transient read failure: keep reading
    }
  }
}

export async function settleComparison(opts: SettleOptions): Promise<ComparisonResult> {
  const stop = new AbortController();
  opts.signal?.addEventListener("abort", () => stop.abort(), { once: true });
  let runId: string | null = null;
  let finished = false;
  let resolveRunId: (id: string) => void = () => undefined;
  const runIdKnown = new Promise<string>((r) => { resolveRunId = r; });

  const readStream = async (): Promise<ComparisonResult | null> => {
    let refusal: ComparisonRefusal | null = null;
    try {
      for await (const evt of opts.events) {
        const read = readEvent(evt);
        if (!read) continue;
        if (read.kind === "run") {
          runId = read.runId;
          opts.onRunId?.(read.runId, read.labels);
          resolveRunId(read.runId);
        } else if (read.kind === "progress") {
          if (!runId && read.progress.runId) {
            runId = read.progress.runId;
            resolveRunId(runId);
          }
          opts.onProgress?.(read.progress);
        } else if (read.kind === "result") {
          return read.result;
        } else refusal = read.refusal;
      }
    } catch (err) {
      if (err instanceof ComparisonRefusal) throw err;
      if (stop.signal.aborted || finished) return null;
      if (!runId) throw err;
      opts.onDropped?.();
      return null; // dropped: the run answers
    }
    if (refusal) throw refusal;
    return null;
  };

  const poller = runIdKnown.then((id) => pollRun(id, { ...opts, signal: stop.signal }));
  poller.catch(() => undefined);
  try {
    const streamed = readStream().then(async (r) => {
      if (r) return r;
      if (!runId) throw new ComparisonRefusal("comparison_no_result", "The comparison ended without a result.");
      return poller;
    });
    return await Promise.race([streamed, poller]);
  } finally {
    finished = true;
    stop.abort();
    opts.stopStream?.();
  }
}
