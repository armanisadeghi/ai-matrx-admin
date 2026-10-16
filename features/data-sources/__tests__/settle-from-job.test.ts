
import { DataFetchRefusal, type DataJobState } from "../contract";
import { settleDataFetch } from "../settle";

const stage = (jobId: string) => ({ event: "data", data: { type: "data_fetch_stage", label: "Collecting", job_id: jobId } });
const RESULT = {
  job_id: "j1", table_id: "t1", table_name: "T", rows_created: 1, rows_updated: 0, records_billed: 1,
  cost_usd: 0.01, columns: ["a"], values_as_text: 0,
};
const done: DataJobState = { state: "done", result: { ...RESULT, limit_applied: null, key_basis: null, notices: [], changes: null } as never };
const running: DataJobState = { state: "running", progress: { label: "Working", current: null, total: null, jobId: "j1" } };

async function* dropsAfterStage(): AsyncGenerator<unknown> {
  yield stage("j1");
  throw new Error("The connection dropped. Your run is still going on the server — reconnecting to it now.");
}
async function* silentForever(signal?: AbortSignal): AsyncGenerator<unknown> {
  yield stage("j1");
  await new Promise<void>((r) => signal?.addEventListener("abort", () => r()));
}

describe("a live-data stream recovers its finished result from the job", () => {
  it("a stream that drops after the first stage resolves from the job", async () => {
    let reads = 0;
    const result = await settleDataFetch({
      events: dropsAfterStage(), pollMs: 5,
      readJob: async () => (++reads < 2 ? running : done),
    });
    expect(result.table_id).toBe("t1");
  });

  it("a stream that goes silent (never ends) still resolves once the job is done", async () => {
    const ctl = new AbortController();
    const result = await settleDataFetch({
      events: silentForever(ctl.signal), pollMs: 5, stopStream: () => ctl.abort(),
      readJob: async () => done,
    });
    expect(result.job_id).toBe("j1");
  });

  it("a job that failed surfaces its refusal after a drop", async () => {
    const failed: DataJobState = { state: "failed", refusal: new DataFetchRefusal("provider_failed", "Nope.") };
    await expect(settleDataFetch({ events: dropsAfterStage(), pollMs: 5, readJob: async () => failed })).rejects.toMatchObject({ code: "provider_failed" });
  });

  it("a drop before any job id was seen has nothing to recover and rethrows", async () => {
    async function* early(): AsyncGenerator<unknown> { throw new Error("boom"); }
    await expect(settleDataFetch({ events: early(), pollMs: 5, readJob: async () => done })).rejects.toThrow("boom");
  });
});
