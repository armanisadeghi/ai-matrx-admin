/**
 * THE ONE-VIEWER RULE (2026-10-16): two mounted viewers of one run — the
 * Computer tab and a Cloud Browser pane — each claimed a control stream, the
 * newer claim superseded the older, and the view the person was typing in
 * froze. These pin the two halves of the fix: a machine run opens only the
 * Computer tab, and only one mounted component holds a run's viewer seat.
 */
jest.mock("@/features/cloud-computer/service", () => ({
  getCloudComputer: jest.fn(),
  lastKnownCloudComputer: () => null,
}));
jest.mock("@/features/canvas/hooks/useCanvas", () => ({ useCanvas: () => ({}) }));
jest.mock("@/features/canvas/host/useArtifactCanvas", () => ({
  useArtifactCanvasActions: () => ({}),
}));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => null }));

import {
  holdRunViewer,
  releaseRunViewer,
  resetRunViewersForTest,
  runViewerHolder,
  subscribeRunViewer,
} from "../runViewer";
import { browserBelongsToComputer } from "../hooks/useOpenCloudBrowserCanvas";

describe("a machine run opens only in the Computer tab", () => {
  const machineRun = { id: "run-m", executionTarget: "sandbox" as const };
  const fleetRun = { id: "run-f", executionTarget: "browser_fleet" as const };

  it("routes the machine's run to the Computer tab", () => {
    expect(browserBelongsToComputer({ sliceRun: machineRun, runId: "run-m", machineExists: true })).toBe(true);
    expect(browserBelongsToComputer({ sliceRun: machineRun, machineExists: null })).toBe(true);
  });

  it("routes an open with no run to the Computer tab when the person has a machine", () => {
    expect(browserBelongsToComputer({ sliceRun: null, machineExists: true })).toBe(true);
    expect(browserBelongsToComputer({ sliceRun: fleetRun, machineExists: true })).toBe(true);
  });

  it("keeps a named fleet run, and everyone without a machine, in the Cloud Browser", () => {
    expect(browserBelongsToComputer({ sliceRun: fleetRun, runId: "run-f", machineExists: true })).toBe(false);
    expect(browserBelongsToComputer({ sliceRun: null, machineExists: false })).toBe(false);
    expect(browserBelongsToComputer({ sliceRun: null, machineExists: null })).toBe(false);
  });
});

describe("one viewer seat per run", () => {
  beforeEach(() => resetRunViewersForTest());

  it("refuses a second viewer and lets a person's press move the seat", () => {
    const computer = Symbol("computer");
    const pane = Symbol("cloud-browser-pane");
    const told: Array<symbol | null> = [];
    subscribeRunViewer(() => told.push(runViewerHolder("run-1")));

    expect(holdRunViewer("run-1", computer)).toBe(true);
    // The automatic open of a second mounted viewer must NOT claim.
    expect(holdRunViewer("run-1", pane)).toBe(false);
    expect(runViewerHolder("run-1")).toBe(computer);

    // "Show it here" moves the seat and the old holder hears about it.
    expect(holdRunViewer("run-1", pane, true)).toBe(true);
    expect(told.at(-1)).toBe(pane);

    releaseRunViewer("run-1", computer); // not the holder: no-op
    expect(runViewerHolder("run-1")).toBe(pane);
    releaseRunViewer("run-1", pane);
    expect(runViewerHolder("run-1")).toBeNull();
  });
});
