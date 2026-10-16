/**
 * A comparison stream that drops (proxy cut, sleep, a closed laptop lid) never loses the run: the
 * run id is the first event, and the durable run answers. Before 2026-10-16 the stream had no id —
 * a drop ended the comparison as a failure while the server finished and billed it.
 */

import { ComparisonRefusal, type ComparisonRunState } from "../contract";
import { pollRun, settleComparison } from "../settle";

const RESULT = {
  kind: "companies_reviews", kind_label: "Companies", status: "live", primary_field: "overall_rating",
  fields: [], items: [], total_records_billed: 2, total_cost_usd: 0.003, total_cost_display: "<$0.01",
  total_points: 60, generated_at: null, notices: [],
};
const runEvent = { event: "data", data: { type: "comparison_run", run_id: "run-1", item_count: 2, labels: ["A", "B"] } };
const stage = { event: "data", data: { type: "comparison_stage", run_id: "run-1", item_index: 0, item_count: 2, item_label: "A", stage: "waiting_for_provider", label: "Reading" } };

const running: ComparisonRunState = {
  run_id: "run-1", kind: "companies_reviews", kind_label: "Companies", status: "running", item_count: 2,
  items: [], result: null, error_code: null, user_message: null, created_at: null, finished_at: null, resuming: false,
};
const done: ComparisonRunState = { ...running, status: "done", result: RESULT as never };

async function* dropsMidRun(): AsyncGenerator<unknown> {
  yield runEvent;
  yield stage;
  throw new Error("The connection dropped.");
}

describe("a comparison recovers from its durable run after any drop", () => {
  it("a stream cut mid-run resolves from the run, and the run id is reported first", async () => {
    const ids: string[] = [];
    let reads = 0;
    const result = await settleComparison({
      events: dropsMidRun(), pollMs: 5, onRunId: (id) => ids.push(id),
      readRun: async () => (++reads < 3 ? running : done),
    });
    expect(ids).toEqual(["run-1"]);
    expect(result.total_points).toBe(60);
    expect(reads).toBeGreaterThanOrEqual(3);
  });

  it("a stream that goes silent still resolves once the run is done", async () => {
    const ctl = new AbortController();
    async function* silent(): AsyncGenerator<unknown> {
      yield runEvent;
      await new Promise<void>((r) => ctl.signal.addEventListener("abort", () => r()));
    }
    const result = await settleComparison({ events: silent(), pollMs: 5, stopStream: () => ctl.abort(), readRun: async () => done });
    expect(result.kind).toBe("companies_reviews");
  });

  it("a run that failed surfaces its sentence after a drop", async () => {
    const failed = { ...running, status: "failed" as const, error_code: "usage_limit", user_message: "You are out of points." };
    await expect(settleComparison({ events: dropsMidRun(), pollMs: 5, readRun: async () => failed }))
      .rejects.toMatchObject({ code: "usage_limit", userMessage: "You are out of points." });
  });

  it("a drop before the run id arrived has nothing to recover and rethrows", async () => {
    async function* early(): AsyncGenerator<unknown> { throw new Error("boom"); }
    await expect(settleComparison({ events: early(), pollMs: 5, readRun: async () => done })).rejects.toThrow("boom");
  });

  it("a page opened on a run id follows it to the end, riding out a busy server", async () => {
    let reads = 0;
    const ctl = new AbortController();
    const result = await pollRun("run-1", {
      signal: ctl.signal, pollMs: 5, immediate: true,
      readRun: async () => {
        reads += 1;
        if (reads === 1) throw new ComparisonRefusal("http_503", "busy");
        return reads < 3 ? running : done;
      },
    });
    expect(result.total_points).toBe(60);
  });

  it("a run the person cannot open stops at once", async () => {
    const ctl = new AbortController();
    await expect(pollRun("nope", {
      signal: ctl.signal, pollMs: 5, immediate: true,
      readRun: async () => { throw new ComparisonRefusal("not_found", "That comparison is not open to you."); },
    })).rejects.toMatchObject({ code: "not_found" });
  });
});
