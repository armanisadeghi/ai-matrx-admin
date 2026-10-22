/**
 * Live walk 2026-10-22: a Data Library run showed a bare "Waiting" for 4-5 minutes. The provider delivers in one
 * batch, so the wait is made honest instead: the real stage in words, the elapsed time, and how long this source
 * usually takes (median of its finished runs).
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";

import { FetchProgress } from "../../FetchProgress";
import { medianRunMs, runStatusLabel } from "../runHistory";

const done = (secs: number) => ({ status: "done", created_at: "2026-10-22T10:00:00Z", finished_at: new Date(Date.parse("2026-10-22T10:00:00Z") + secs * 1000).toISOString() });

describe("an honest wait", () => {
  it("never says a bare Waiting", () => {
    for (const s of ["queued", "fetching", "waiting_for_provider", "storing"]) expect(runStatusLabel(s)).not.toBe("Waiting");
    expect(runStatusLabel("waiting_for_provider")).toBe("Collecting at the source");
  });

  it("learns the usual length from finished runs only, and needs two to call it usual", () => {
    expect(medianRunMs([done(100)])).toBeNull();
    expect(medianRunMs([done(100), done(300), done(200)])).toBe(200_000);
    expect(medianRunMs([done(100), done(300)])).toBe(200_000);
    expect(medianRunMs([done(100), { ...done(900), status: "failed" }, done(300)])).toBe(200_000);
  });

  it("shows the elapsed time and the usual length beside the stage", () => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    act(() => root.render(<FetchProgress label="x" progress={{ label: "Collecting at the source", current: null, total: null, jobId: "j" }} startedAt={Date.now()} layout="row" typicalMs={180_000} />));
    expect(host.textContent).toContain("Collecting at the source");
    expect(host.textContent).toContain("Usually about");
    act(() => root.unmount());
    host.remove();
  });
});
