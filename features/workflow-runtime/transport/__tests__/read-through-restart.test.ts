/**
 * MKT-089 (2026-10-15): a Smart Add page opened while the server restarted for a release got 502s (CORS-blocked, so
 * "Failed to fetch") on /runs/<id> and /runs/<id>/events; the attach read tried once, so the run read as "We could
 * not read this run" for good and every failure landed in the error badge. Run reads now ride through a restart.
 */
import { configureStore } from "@reduxjs/toolkit";

import { isRestartFailure, readThroughRestart, restartQuietCapture, RESTART_WINDOW_MS } from "../read-through-restart";

const getJson = jest.fn();
const capture = jest.fn();
jest.mock("@/lib/python-client", () => ({ getJson: (...a: unknown[]) => getJson(...a) }));
jest.mock("@/lib/diagnostics/capturePythonClientError", () => ({
  capturePythonClientError: (...a: unknown[]) => capture(...a),
  relationPathFromUrl: (p: string) => p.split("?")[0],
}));
jest.mock("@/lib/diagnostics/errorCaptureStore", () => ({ captureError: jest.fn() }));

const gateway = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });

describe("isRestartFailure", () => {
  it("a failed fetch, a timeout and a gateway 502/503/504 are a restart; a refusal is not", () => {
    expect(isRestartFailure(new TypeError("Failed to fetch"))).toBe(true);
    expect(isRestartFailure({ code: "request_timeout" })).toBe(true);
    for (const s of [502, 503, 504]) expect(isRestartFailure(gateway(s))).toBe(true);
    for (const s of [400, 401, 403, 404, 500]) expect(isRestartFailure(gateway(s))).toBe(false);
    expect(isRestartFailure(new DOMException("gone", "AbortError"))).toBe(false);
  });
});

describe("readThroughRestart", () => {
  let clock = 0;
  const opts = { now: () => clock, sleep: async (ms: number) => void (clock += ms) };
  beforeEach(() => (clock = 0));

  it("answers once the server is back", async () => {
    const read = jest.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockRejectedValueOnce(gateway(502)).mockResolvedValue("row");
    await expect(readThroughRestart(read, opts)).resolves.toBe("row");
    expect(read).toHaveBeenCalledTimes(3);
  });
  it("a refusal is never retried", async () => {
    const read = jest.fn().mockRejectedValue(gateway(403));
    await expect(readThroughRestart(read, opts)).rejects.toMatchObject({ status: 403 });
    expect(read).toHaveBeenCalledTimes(1);
  });
  it("gives up after the restart window", async () => {
    const read = jest.fn().mockRejectedValue(gateway(502));
    await expect(readThroughRestart(read, opts)).rejects.toMatchObject({ status: 502 });
    expect(clock).toBeLessThanOrEqual(RESTART_WINDOW_MS);
    expect(clock).toBeGreaterThan(RESTART_WINDOW_MS - 20_000);
  });
  it("stops when the caller lets go", async () => {
    const read = jest.fn().mockRejectedValue(gateway(502));
    await expect(readThroughRestart(read, { ...opts, isStopped: () => true })).rejects.toMatchObject({ status: 502 });
    expect(read).toHaveBeenCalledTimes(1);
  });
});

describe("restartQuietCapture", () => {
  it("a refusal goes to the badge at once; a restart only after the whole window", () => {
    let t = 0;
    const c = restartQuietCapture({ now: () => t });
    expect(c.failed(gateway(401))).toBe(true);
    expect(c.failed(gateway(502))).toBe(false);
    t = RESTART_WINDOW_MS - 1;
    expect(c.failed(new TypeError("Failed to fetch"))).toBe(false);
    t = RESTART_WINDOW_MS;
    expect(c.failed(gateway(503))).toBe(true);
    c.answered();
    expect(c.failed(gateway(502))).toBe(false);
  });
});

describe("adopting a run while the server restarts (the Smart Add path)", () => {
  const RUN = "5dfabe93-32ec-499d-baa1-8467f108c580";
  beforeEach(() => {
    jest.useFakeTimers();
    getJson.mockReset();
    capture.mockReset();
  });
  afterEach(() => jest.useRealTimers());

  it("the run reads back once the server answers: no read failure, nothing in the error badge", async () => {
    const { default: reducer } = await import("@/features/workflow-runtime/redux/workflow-runs.slice");
    const { adoptWorkflowRun } = await import("@/features/workflow-runtime/redux/adopt-workflow-run.thunk");
    const { selectRunReadFailure } = await import("@/features/workflow-runtime/redux/workflow-runs.selectors");
    const store = configureStore({ reducer: { workflowRuns: reducer }, middleware: (d) => d({ serializableCheck: false, immutableCheck: false }) });
    // The first two reads of each path fail the way a restarting gateway does, then the server is back.
    const fails = new Map<string, number>();
    getJson.mockImplementation(async (path: string) => {
      const key = path.split("?")[0];
      const n = fails.get(key) ?? 0;
      fails.set(key, n + 1);
      if (n === 0) throw new TypeError("Failed to fetch");
      if (n === 1) throw gateway(502);
      return { data: key.endsWith("/events") ? [] : { id: RUN, status: "completed", output: {}, steps_executed: 8 } };
    });
    const handle = store.dispatch(adoptWorkflowRun({ runId: RUN }) as never) as { stop: () => void };
    for (let i = 0; i < 20; i++) await jest.advanceTimersByTimeAsync(1_000);
    const state = store.getState() as never;
    expect(selectRunReadFailure(RUN)(state)).toBeFalsy();
    expect(capture).not.toHaveBeenCalled();
    expect(getJson.mock.calls.every(([, o]) => (o as { captureErrors?: boolean })?.captureErrors === false)).toBe(true);
    handle.stop();
  });
});
