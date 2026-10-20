// A SNAPSHOT JOB THAT STOPS MOVING SAYS SO (live walk 2026-10-19, FIX-SNAP2). The Snapshots dialog read the job once a
// second in a `for (;;)`: a job whose view stayed "running" with the same progress (a worker that died before settling,
// a lease nobody picked up) held the dialog on "Copying …" forever with no word. Now a job whose phase and progress do
// not change for SNAPSHOT_JOB_STALL_READS reads in a row stops being followed and the dialog says so.
// RED on the prior bytes: followBaseSnapshotJob never returned and SNAPSHOT_JOB_STALL_READS did not exist.

const getJson = jest.fn();
jest.mock("@/lib/python-client", () => ({ postJson: jest.fn(), getJson: (...a: unknown[]) => getJson(...a) }));
jest.mock("@/lib/knobs/featureKnobs", () => ({ knobInt: async () => 250 }));

import { followBaseSnapshotJob, SNAPSHOT_JOB_STALL_READS } from "../baseMoveJob";

const running = (done: number, seconds: number) => ({
  data: { state: "running", kind: "snapshot", phase: "copying", progress: { table: "LC-base — Table 1", at: 1, of: 1, done, total: 1350, seconds } },
});

describe("a snapshot job that stops moving says so", () => {
  beforeEach(() => { jest.useFakeTimers(); getJson.mockReset(); });
  afterEach(() => jest.useRealTimers());

  it("stops after SNAPSHOT_JOB_STALL_READS reads with the same progress (the clock alone is not progress)", async () => {
    let n = 0;
    getJson.mockImplementation(async () => running(125, ++n));
    const pending = followBaseSnapshotJob("org-a", "job-1", () => {});
    await jest.runAllTimersAsync();
    const view = await pending;
    expect(view.state).toBe("refused");
    if (view.state !== "refused") return;
    expect(view.code).toBe("stalled");
    expect(view.message).toMatch(/125 of 1,350 rows/);
    expect(getJson).toHaveBeenCalledTimes(SNAPSHOT_JOB_STALL_READS + 1);
  });

  it("a job that keeps moving is followed to the end", async () => {
    let n = 0;
    getJson.mockImplementation(async () => {
      n += 1;
      return n > SNAPSHOT_JOB_STALL_READS * 2 ? { data: { state: "done", kind: "snapshot", result: { tables: [] } } } : running(n, n);
    });
    const pending = followBaseSnapshotJob("org-a", "job-1", () => {});
    await jest.runAllTimersAsync();
    expect((await pending).state).toBe("done");
  });
});
