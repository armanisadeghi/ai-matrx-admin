/**
 * Settle a live-data stream against its durable job.
 *
 * The server keeps the job whether or not the browser stays connected (`GET /data-sources/jobs/{id}`),
 * but a long quiet stream is cut by proxies / QUIC / sleep, and a cut stream used to END the run as a
 * failure (or hang) while the job finished on the server. The rule, for EVERY caller of the stream:
 *   - the job id is taken from the first stage event;
 *   - while the stream is open the job is also polled, so a stream that goes quiet or never reports
 *     its end still resolves from the job;
 *   - when the stream throws (anything but a refusal the server sent) or ends without an answer, the
 *     job is polled until it is terminal and ITS result is the answer.
 * Only a stream that dropped before any job id was seen has nothing to recover and rethrows.
 */

import { DataFetchRefusal, readEvent, type DataFetchProgress, type DataFetchResult, type DataJobState } from "./contract";

export interface SettleOptions {
  events: AsyncIterable<unknown>;
  readJob: (jobId: string, signal: AbortSignal) => Promise<DataJobState>;
  onProgress?: (p: DataFetchProgress) => void;
  /** Stops everything (the caller left). */
  signal?: AbortSignal;
  /** Called to stop the stream read once the job has answered. */
  stopStream?: () => void;
  pollMs?: number;
}

export const SETTLE_POLL_MS = 6000;

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => { clearTimeout(t); resolve(); }, { once: true });
  });

function fromJob(job: DataJobState): DataFetchResult | null {
  if (job.state === "done") return job.result;
  if (job.state === "failed") throw job.refusal;
  return null;
}

export async function settleDataFetch(opts: SettleOptions): Promise<DataFetchResult> {
  const pollMs = opts.pollMs ?? SETTLE_POLL_MS;
  const stop = new AbortController();
  opts.signal?.addEventListener("abort", () => stop.abort(), { once: true });
  let jobId: string | null = null;
  let finished = false;

  const readStream = async (): Promise<DataFetchResult | null> => {
    let refusal: DataFetchRefusal | null = null;
    try {
      for await (const evt of opts.events) {
        const read = readEvent(evt);
        if (!read) continue;
        if (read.kind === "progress") {
          jobId = read.progress.jobId ?? jobId;
          opts.onProgress?.(read.progress);
        } else if (read.kind === "result") {
          return read.result;
        } else refusal = read.refusal;
      }
    } catch (err) {
      if (err instanceof DataFetchRefusal) throw err;
      if (stop.signal.aborted || finished) return null;
      if (!jobId) throw err;
      return null; // dropped: the job answers
    }
    if (refusal) throw refusal;
    return null;
  };

  // Poll the job: the answer when the stream is quiet, cut, or ended without one.
  const pollJob = async (): Promise<DataFetchResult> => {
    for (;;) {
      await sleep(pollMs, stop.signal);
      if (stop.signal.aborted) throw new DataFetchRefusal("data_fetch_cancelled", "The fetch was stopped.");
      if (!jobId) continue;
      try {
        const job = await opts.readJob(jobId, stop.signal);
        const done = fromJob(job);
        if (done) return done;
        if (job.state === "running") opts.onProgress?.({ ...job.progress, jobId });
      } catch (err) {
        if (err instanceof DataFetchRefusal && err.code !== "http_404" && !err.code.startsWith("http_5")) throw err;
        // A transient read failure: keep polling.
      }
    }
  };

  const poller = pollJob();
  poller.catch(() => undefined);
  try {
    const streamed = readStream().then(async (r) => {
      if (r) return r;
      if (!jobId) throw new DataFetchRefusal("data_fetch_no_result", "The fetch ended without a table.");
      return poller;
    });
    return await Promise.race([streamed, poller]);
  } finally {
    finished = true;
    stop.abort();
    opts.stopStream?.();
  }
}
