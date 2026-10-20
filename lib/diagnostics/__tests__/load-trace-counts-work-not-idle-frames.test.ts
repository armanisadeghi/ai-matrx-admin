/**
 * The load trace reports a STALL only for main-thread work, and a steady poll is never a DUPLICATE.
 *
 * Live 2026-10-20 (defect D, mandate support run page): the console said "[load] STALL long frame (~1000ms)"
 * every second and "/api/dev/server-freshness … DUPLICATE" on every poll. Measured: each of those frames had
 * blockingDuration 0, 0–7 ms of script and renderStart ≈ duration — the tab was hidden, so Chromium rendered
 * about once a second and every frame "lasted" a second with nothing running; and the freshness check fired
 * exactly once per 15 s (3255, 18284, 33634, 48931, 64214, 79587 ms) — its react-query refetchInterval.
 */
import { __loadTraceTesting, loadTraceReport, resetLoadTraceForTests } from "@/lib/diagnostics/loadTrace";

function frame(over: Record<string, unknown>) {
  return { entryType: "long-animation-frame", name: "long-animation-frame", startTime: 5000, duration: 1000, ...over } as unknown as PerformanceEntry;
}

function resource(name: string, startTime: number) {
  return { name, startTime, duration: 40, initiatorType: "fetch", encodedBodySize: 1024, transferSize: 0, entryType: "resource" } as unknown as PerformanceEntry;
}

beforeEach(() => {
  resetLoadTraceForTests();
  (performance as unknown as { getEntriesByType: () => PerformanceEntry[] }).getEntriesByType = () => [];
});

describe("long frames", () => {
  const { frameBusyMs } = __loadTraceTesting;
  it("an idle frame waiting for a throttled render is not a stall", () => {
    // The live capture: 994 ms long, 7 ms of script, rendering at +991 ms, blockingDuration 0.
    expect(frameBusyMs(frame({ duration: 994, renderStart: 5991, blockingDuration: 0, scripts: [{ duration: 7 }] }))).toBeLessThan(100);
    expect(frameBusyMs(frame({ duration: 1013, renderStart: 6013, blockingDuration: 0, scripts: [] }))).toBeLessThan(100);
  });
  it("a frame busy with script or rendering is", () => {
    expect(frameBusyMs(frame({ duration: 400, renderStart: 5390, blockingDuration: 340, scripts: [{ duration: 380 }] }))).toBeGreaterThanOrEqual(380);
    expect(frameBusyMs(frame({ duration: 300, renderStart: 5050, blockingDuration: 250, scripts: [] }))).toBeGreaterThanOrEqual(250);
  });
});

describe("polls", () => {
  const url = "http://localhost/api/dev/server-freshness";
  it("a request repeating every 15 s is a poll, never a duplicate", () => {
    for (const t of [3255, 18284, 33634, 48931, 64214, 79587]) __loadTraceTesting.onResource(resource(url, t));
    expect(loadTraceReport().duplicates).toEqual([]);
    expect(loadTraceReport().requests.at(-1)).toMatchObject({ times: 1, pollEveryMs: expect.any(Number) });
  });
  it("the same request fired twice close together is still a duplicate", () => {
    __loadTraceTesting.onResource(resource(url, 3255));
    __loadTraceTesting.onResource(resource(url, 3300));
    expect(loadTraceReport().duplicates).toEqual([expect.objectContaining({ times: 2 })]);
  });
});
