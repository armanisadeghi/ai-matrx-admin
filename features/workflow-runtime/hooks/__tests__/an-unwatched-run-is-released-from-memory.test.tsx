/** @jest-environment jsdom */
//
// MKT-165 — Smart Add runs never left browser memory: the workflowRuns slice
// kept every finished run, with all its events, for the life of the tab. A run
// no screen watches is now released after a retention window and a cap on kept
// runs; an open run is never dropped; reopening adopts it again (the adopter
// then reads it back from the database). Fails against the HEAD hook, which
// never released anything.

import React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { configureStore } from "@reduxjs/toolkit";

const adopted: string[] = [];
jest.mock("../../redux/adopt-workflow-run.thunk", () => ({
  adoptWorkflowRun: ({ runId }: { runId: string }) => () => {
    adopted.push(runId);
    return { runId, stop: jest.fn(), ensureLane: () => null };
  },
}));
let testDispatch: (a: unknown) => unknown;
jest.mock("@/lib/redux/hooks", () => ({ useAppDispatch: () => testDispatch }));

import workflowRunsReducer, {
  attachRun,
} from "../../redux/workflow-runs.slice";
import { ADOPTION_RELEASE_GRACE_MS, useWorkflowRun } from "../useWorkflowRun";
import {
  MAX_UNWATCHED_RUNS_KEPT,
  RUN_STATE_RETENTION_MS,
} from "../../redux/run-state-retention";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function setup() {
  const store = configureStore({ reducer: { workflowRuns: workflowRunsReducer } });
  testDispatch = store.dispatch as typeof testDispatch;
  const ids = () => Object.keys(store.getState().workflowRuns.byRunId);
  function Watch({ runId }: { runId: string | null }) {
    useWorkflowRun(runId);
    return null;
  }
  const host = document.createElement("div");
  const root = createRoot(host);
  const show = (runId: string | null) =>
    act(() => {
      if (runId) store.dispatch(attachRun({ runId }));
      root.render(<Watch runId={runId} />);
    });
  return { store, ids, show, root };
}

const settle = (ms: number) => act(() => void jest.advanceTimersByTime(ms));

describe("an unwatched run is released from browser memory", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    adopted.length = 0;
  });
  afterEach(() => jest.useRealTimers());

  it("keeps an open run however long it streams", () => {
    const { ids, show } = setup();
    show("run-a");
    settle(ADOPTION_RELEASE_GRACE_MS + RUN_STATE_RETENTION_MS * 5);
    expect(ids()).toEqual(["run-a"]);
  });

  it("releases a run after the grace and retention windows once nobody watches it", () => {
    const { ids, show } = setup();
    show("run-a");
    show(null);
    settle(ADOPTION_RELEASE_GRACE_MS + RUN_STATE_RETENTION_MS - 1_000);
    expect(ids()).toEqual(["run-a"]); // still inside the window: a quick return is instant
    settle(2_000);
    expect(ids()).toEqual([]);
  });

  it("does not release a run that is reopened inside the window", () => {
    const { ids, show } = setup();
    show("run-a");
    show(null);
    settle(ADOPTION_RELEASE_GRACE_MS + 10_000);
    show("run-a");
    settle(RUN_STATE_RETENTION_MS * 3);
    expect(ids()).toEqual(["run-a"]);
  });

  it("caps how many unwatched runs stay in memory, oldest first", () => {
    const { ids, show } = setup();
    const names = Array.from({ length: MAX_UNWATCHED_RUNS_KEPT + 2 }, (_, i) => `run-${i}`);
    for (const n of names) {
      show(n);
      show(null);
      settle(ADOPTION_RELEASE_GRACE_MS + 1);
    }
    expect(ids()).toEqual(names.slice(-MAX_UNWATCHED_RUNS_KEPT));
  });

  it("adopts a released run afresh when it is reopened", () => {
    const { ids, show } = setup();
    show("run-a");
    show(null);
    settle(ADOPTION_RELEASE_GRACE_MS + RUN_STATE_RETENTION_MS + 1);
    expect(ids()).toEqual([]);
    adopted.length = 0;
    show("run-a");
    expect(adopted).toEqual(["run-a"]);
  });
});
