/**
 * THE SILENCE GUARD — a live run whose SSE stream keeps pinging but stops
 * delivering events must still reach its terminal event.
 *
 * Reproduces the Smart Add stall (runs f444f51e, fcb2073c, a3fcc8e1,
 * 2026-10-12): the browser got the first event, the SSE stream claimed the
 * wire on its first frame (the poller stood down), then the server's
 * LISTEN/NOTIFY path delivered nothing while keepalive pings kept the stall
 * detector quiet — the page sat on "Checking the website" over a run that
 * had finished on the server.
 *
 * Here `streamSse` is scripted: it delivers seq 1, then only pings (every
 * 10 s, under the 20 s stall timeout) until aborted. The durable log the
 * poll endpoint serves grows to the full run, terminal event included.
 */

jest.mock("@/features/workflow-runtime/transport/sse", () => ({
  streamSse: jest.fn(),
}));

import { streamSse } from "@/features/workflow-runtime/transport/sse";
import {
  RUN_EVENT_SILENCE_MS,
  startRunEventSource,
} from "@/features/workflow-runtime/transport/run-event-source";
import type { RunEventRecord } from "@/features/workflow-runtime/types";

const RUN_ID = "run-silent-stream";

function record(seq: number, eventType: string, extra: Record<string, unknown> = {}): RunEventRecord {
  return {
    seq,
    event_type: eventType,
    payload: { run_id: RUN_ID, ...extra },
  } as unknown as RunEventRecord;
}

/** The server's durable log: seq 1 at start, the rest lands at +5 s. */
function durableLog(nowMs: number, startMs: number): RunEventRecord[] {
  const rows = [record(1, "run_started")];
  if (nowMs - startMs >= 5_000) {
    rows.push(
      record(2, "node_started", { node_id: "probe" }),
      record(3, "node_completed", { node_id: "probe", output: {} }),
      record(4, "run_completed", { output: {} }),
    );
  }
  return rows;
}

describe("run event source — silence guard", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("delivers the terminal event when SSE pings but drops every live event", async () => {
    const startMs = Date.now();

    // SSE: frame 1 = seq 1 (claims the wire), then pings only, until aborted.
    (streamSse as jest.Mock).mockImplementation(
      (
        _path: string,
        onEvent: (eventType: string, data: string, id: string | null) => void,
        options: { signal: AbortSignal; onFrame?: () => void },
      ) =>
        new Promise<void>((_resolve, reject) => {
          options.onFrame?.();
          onEvent("data", JSON.stringify({ event: "run_started", run_id: RUN_ID }), "1");
          const ping = setInterval(() => options.onFrame?.(), 10_000);
          options.signal.addEventListener("abort", () => {
            clearInterval(ping);
            reject(new Error("aborted"));
          });
        }),
    );

    async function fetchJson<T>(path: string): Promise<T> {
      const match = /after_seq=(\d+)/.exec(path);
      const after = match ? Number(match[1]) : 0;
      return durableLog(Date.now(), startMs).filter((r) => (r.seq ?? 0) > after) as unknown as T;
    }

    const seen: string[] = [];
    const onSilence = jest.fn();
    const source = startRunEventSource({
      runId: RUN_ID,
      baseUrl: "",
      getHeaders: () => ({}),
      initialCursor: null,
      fetchJson,
      onEvent: (event) => {
        if ("event" in event) seen.push(String(event.event));
      },
      onSilence,
    });

    // 60 s of wall time: far past the run's end on the server.
    for (let i = 0; i < 60; i += 1) {
      await jest.advanceTimersByTimeAsync(1_000);
    }
    source.stop();

    expect(seen).toContain("run_completed");
    expect(onSilence).toHaveBeenCalled();
    // The guard fires within one silence window of the log growing.
    expect(RUN_EVENT_SILENCE_MS).toBeLessThanOrEqual(10_000);
  });
});
