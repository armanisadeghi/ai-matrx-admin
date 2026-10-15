/**
 * MKT-106: a step's live frames can beat its durable `node_started` over the wire (seen live on Smart Add's
 * facts step: the `user_request` reserved record_update minted the lane 63 ms before the step existed in the
 * slice). `registerLane` used to drop the id when the invocation was not there yet, and the lane manager never
 * registers an existing lane twice — so the step had no `laneRequestId` for its whole life and every reader
 * of its forming value (`selectLiveKindValue(laneRequestId)`) saw nothing until the step ended.
 *
 * Drives the REAL lane manager into the REAL reducer, in the wire order that failed.
 */

import reducer, {
  applyRunEvent,
  attachRun,
  type WorkflowRunsState,
} from "@/features/workflow-runtime/redux/workflow-runs.slice";
import { RunLaneManager } from "@/features/workflow-runtime/redux/lane-manager";
import { invocationKeyOf, type WorkflowRunEvent } from "@/features/workflow-runtime/types";

const RUN_ID = "run-lane-race";

function nodeStarted(nodeId: string): WorkflowRunEvent {
  return {
    event: "node_started",
    run_id: RUN_ID,
    node_id: nodeId,
    step: 1,
    attempt: 1,
    ts: "2026-10-15T00:00:01Z",
  } as WorkflowRunEvent;
}

function harness() {
  let state: WorkflowRunsState = reducer(reducer(undefined, { type: "@@INIT" }), attachRun({ runId: RUN_ID }));
  // Only workflow-runs actions reach this reducer; the lane's request-row actions belong to another slice.
  const dispatch = ((action: { type: string }) => {
    state = reducer(state, action as Parameters<typeof reducer>[1]);
    return action;
  }) as unknown as ConstructorParameters<typeof RunLaneManager>[0];
  const manager = new RunLaneManager(dispatch);
  const apply = (event: WorkflowRunEvent) => {
    state = reducer(state, applyRunEvent({ runId: RUN_ID, event, seq: null, replay: false }));
  };
  return { manager, apply, get: () => state };
}

describe("a lane minted before its step starts", () => {
  test("the step takes the lane id when node_started arrives after the first frame", () => {
    const { manager, apply, get } = harness();
    const key = invocationKeyOf("facts", null, 0);

    // First frame first: the lane is minted while the step does not exist yet.
    const lane = manager.ensureLane(RUN_ID, key);
    expect(lane).not.toBeNull();
    expect(get().byRunId[RUN_ID].nodes[key]).toBeUndefined();

    // Then the durable node_started. The thunk's own ensureLane returns the SAME lane (no second register).
    apply(nodeStarted("facts"));
    expect(manager.ensureLane(RUN_ID, key)?.requestId).toBe(lane!.requestId);

    expect(get().byRunId[RUN_ID].nodes[key].laneRequestId).toBe(lane!.requestId);
    expect(get().byRunId[RUN_ID].pendingLanes[key]).toBeUndefined();
  });

  test("the ordinary order still registers, and a released early lane never attaches later", () => {
    const { manager, apply, get } = harness();
    const facts = invocationKeyOf("facts", null, 0);
    apply(nodeStarted("facts"));
    const lane = manager.ensureLane(RUN_ID, facts);
    expect(get().byRunId[RUN_ID].nodes[facts].laneRequestId).toBe(lane!.requestId);

    const web = invocationKeyOf("web", null, 0);
    manager.ensureLane(RUN_ID, web);
    manager.release(RUN_ID, web);
    apply(nodeStarted("web"));
    expect(get().byRunId[RUN_ID].nodes[web].laneRequestId).toBeNull();
  });
});
