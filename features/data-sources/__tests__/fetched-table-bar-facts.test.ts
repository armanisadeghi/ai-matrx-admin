import { barFacts } from "../barFacts";
import { consumeDataFetch, isOpenJob, parseSpec, type DataFetchSpec } from "../contract";

const summary = { added: 2, changed: 3, gone: 0, unchanged: 20, gone_checked: true, first_fetch: false };
const specOf = (over: Record<string, unknown> = {}): DataFetchSpec =>
  parseSpec({ id: "j1", source_key: "reviews", max_records: 5, status: "done", rows_created: 0, rows_updated: 0, result: { changes: summary }, ...over })!;

describe("the fetched-table bar's row count", () => {
  it("says the table's real 25 rows, not the last refresh's 5, and offers Check all 25", () => {
    const f = barFacts({ liveRows: 25, spec: specOf({ rows_created: 2, rows_updated: 3 }), refreshCount: 5, limit: 100, runBusy: false });
    expect(f.rows).toBe(25);
    expect(f.refreshCount).toBe(5);
    expect(f.showAll).toBe(true);
    expect(f.allCount).toBe(25);
    expect(f.thisRefresh).toBe("this refresh: 2 new · 3 changed · 0 gone");
  });
  it("still says 25 right after a refresh that changed nothing (not '0 rows')", () => {
    const f = barFacts({ liveRows: 25, spec: specOf({ rows_created: 0, rows_updated: 0, result: { changes: { ...summary, added: 0, changed: 0 } } }), refreshCount: 5, limit: null, runBusy: false });
    expect(f.rows).toBe(25);
    expect(f.showAll).toBe(true);
  });
  it("no 'Check all' when the refresh already covers the table", () => {
    expect(barFacts({ liveRows: 5, spec: specOf(), refreshCount: 5, limit: null, runBusy: false }).showAll).toBe(false);
  });
});

describe("the bar follows the job to its end", () => {
  it("a job in an open stage is busy, a finished one is not", () => {
    for (const status of ["queued", "fetching", "waiting_for_provider", "storing"]) {
      expect(isOpenJob(status)).toBe(true);
      expect(barFacts({ liveRows: 25, spec: specOf({ status }), refreshCount: 5, limit: null, runBusy: false }).busy).toBe(true);
    }
    expect(barFacts({ liveRows: 25, spec: specOf({ status: "done" }), refreshCount: 5, limit: null, runBusy: false }).busy).toBe(false);
    expect(barFacts({ liveRows: 25, spec: specOf({ status: "failed" }), refreshCount: 5, limit: null, runBusy: false }).busy).toBe(false);
  });
  it("a stream that stays open after its result still ends the run", async () => {
    async function* events() {
      yield { event: "data", data: { type: "data_fetch_result", result: { job_id: "j1", table_id: "t1", table_name: "T", rows_created: 1, rows_updated: 0, records_billed: 1, cost_usd: 0.01, columns: [], values_as_text: 0, limit_applied: null } } };
      await new Promise(() => {}); // never closes
    }
    const result = await Promise.race([consumeDataFetch(events()), new Promise<string>((r) => setTimeout(() => r("hung"), 500))]);
    expect(result).not.toBe("hung");
  });
});

describe("View changes", () => {
  it("is there for a finished job with a change set, even 'Nothing changed'", () => {
    const none = barFacts({ liveRows: 25, spec: specOf({ result: { changes: { ...summary, added: 0, changed: 0 } } }), refreshCount: 5, limit: null, runBusy: false });
    expect(none.changesJob?.jobId).toBe("j1");
    expect(none.changesLabel).toBe("Nothing changed");
    expect(none.changesFlag).toBe("none");
  });
  it("stays while a newer job runs (reads the last finished one)", () => {
    const running = { ...specOf({ id: "j2", status: "fetching", result: null }), lastDone: specOf() };
    const f = barFacts({ liveRows: 25, spec: running, refreshCount: 5, limit: null, runBusy: false });
    expect(f.changesJob?.jobId).toBe("j1");
    expect(f.changesFlag).toBe("some");
  });
});
