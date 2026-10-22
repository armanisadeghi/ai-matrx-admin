/**
 * Owner, 2026-10-22: "it's rediculous that we're not showing the time it takes for these in our results" and "something
 * that shows for me as an admin so that I can see exactly what is running under the hood". The words a run's header,
 * its past runs and its source card say, and the admin block that a member never gets.
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";

import { durationWords, roughDurationWords, speedsByKey, stageTimeline, tookWords, usuallyWords } from "../runTiming";
import { providerName, SourceMethodTag, UnderTheHood } from "../UnderTheHood";

describe("how long a fetch took, in plain words", () => {
  it("says the run's own length the way a person reads it", () => {
    expect(tookWords(609_000)).toBe("Took 10 min 9 s");
    expect(durationWords(45_400)).toBe("45 s");
    expect(durationWords(120_000)).toBe("2 min");
    expect(durationWords(3_720_000)).toBe("1 h 2 min");
  });

  it("rounds the usual length like speech", () => {
    expect(usuallyWords(118_000)).toBe("Usually ~2 min");
    expect(roughDurationWords(42_000)).toBe("~40 s");
    expect(roughDurationWords(7_000)).toBe("~7 s");
  });

  it("calls a speed usual only with two or more finished runs", () => {
    const map = speedsByKey([
      { source_key: "a", typical_ms: 51_924, p95_ms: 301_918, runs: 30 },
      { source_key: "b", typical_ms: 9_000, p95_ms: 9_000, runs: 1 },
    ]);
    expect(Object.keys(map)).toEqual(["a"]);
    expect(map.a).toEqual({ typicalMs: 51_924, p95Ms: 301_918, runs: 30 });
  });

  it("lays the stages out in order with the time each took", () => {
    const t = stageTimeline({
      queued: "2026-10-22T10:00:00Z", sent: "2026-10-22T10:00:01Z", provider_ready: "2026-10-22T10:09:00Z",
      collected: "2026-10-22T10:09:05Z", saved: "2026-10-22T10:10:09Z", done: "2026-10-22T10:10:09Z",
    });
    expect(t.map((s) => s.label)).toEqual(["Queued", "Sent to provider", "Provider ready", "Collected", "Saved", "Done"]);
    expect(t[2].tookMs).toBe(539_000);
    expect(t[0].tookMs).toBeNull();
  });

  it("names the vendor by its real name for the admin", () => {
    expect(providerName("brightdata")).toBe("Bright Data");
    expect(providerName("serpapi")).toBe("SerpAPI");
  });
});

describe("under the hood is admin only", () => {
  it("renders nothing, and reads nothing, for a member (no admin store)", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => root.render(<><UnderTheHood jobId="job-1" open /><SourceMethodTag sourceKey="zillow_listing" /></>));
    expect(host.innerHTML).toBe("");
    act(() => root.unmount());
    host.remove();
  });
});
