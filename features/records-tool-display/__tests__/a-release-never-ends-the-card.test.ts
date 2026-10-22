/**
 * A RELEASE NEVER ENDS THE CARD (lane UI1, live defect 2026-10-22).
 *
 * A customer's import run (1b7b670d) was cancelled by a deploy drain (`metadata._cancel.reason`
 * "deploy_drain"); the recovery sweep resumed it 30 s later (status back to "running", reason
 * "resumed_after_shutdown"). The card read the cancel as the run's end: it folded to "Canceled",
 * left the chat's dock, and never followed the run again while it kept importing.
 *
 * Fails when: a shutdown cancel (the server's set: immediate, deploy_drain, owner_died) reads as
 * over or as the person's own stop, or the re-read resumed row does not bring the card back to
 * working on the step it was on. A person's own stop still reads as cancelled.
 */
import { describe, expect, it } from "@jest/globals";
import reducer, { applyRunEvent, attachRun, seedRunRow } from "@/features/workflow-runtime/redux/workflow-runs.slice";
import type { RunRow, WorkflowRunEvent } from "@/features/workflow-runtime/types";
import { readBackgroundRun } from "../backgroundRun";

const RUN_ID = "1b7b670d-c8dd-40da-8c83-eff7a70508cb";

function ev(seq: number, body: Record<string, unknown>) {
  return applyRunEvent({ runId: RUN_ID, event: { run_id: RUN_ID, step: 1, attempt: 1, ...body } as unknown as WorkflowRunEvent, seq, replay: false });
}

function row(status: string, reason: string | null): RunRow {
  return { id: RUN_ID, status, metadata: reason ? { _cancel: { reason } } : {}, error: null, input: null, started_at: "2026-10-22T19:30:00Z", completed_at: status === "cancelled" ? "2026-10-22T19:49:00Z" : null } as unknown as RunRow;
}

function importing() {
  let state = reducer(reducer(undefined, { type: "@@INIT" }), attachRun({ runId: RUN_ID }));
  for (const action of [
    ev(1, { event: "run_started", ts: "2026-10-22T19:30:00Z", input: { root: "a\nb", name: "Whole workspace" } }),
    ev(2, { event: "node_started", node_id: "import", ts: "2026-10-22T19:30:01Z" }),
    ev(3, { event: "node_progress", node_id: "import", message: "rows: Clients", current: 2000, total: 13000, ts: "2026-10-22T19:48:00Z" }),
  ]) state = reducer(state, action);
  return state;
}

describe("a run a release cancelled", () => {
  it("reads as paused for a server update, never over, then follows the resumed run on its step", () => {
    let state = reducer(importing(), ev(4, { event: "run_cancelled", reason: "immediate", steps_executed: 1, ts: "2026-10-22T19:49:00Z" }));
    state = reducer(state, seedRunRow({ runId: RUN_ID, row: row("cancelled", "deploy_drain") }));
    const held = readBackgroundRun(state.byRunId[RUN_ID] ?? null, "import");
    expect(held.phase).toBe("resuming");
    expect(held.endedAt).toBeNull();

    state = reducer(state, seedRunRow({ runId: RUN_ID, row: row("running", "resumed_after_shutdown") }));
    const back = readBackgroundRun(state.byRunId[RUN_ID] ?? null, "import");
    expect(back.phase).toBe("working");
    expect(back.sample).toMatchObject({ stageIndex: 4, current: 2000, total: 13000 });
  });

  it("reads a cancel the row names as a drain as resuming even before any event", () => {
    let state = reducer(importing(), seedRunRow({ runId: RUN_ID, row: row("cancelled", "deploy_drain") }));
    expect(readBackgroundRun(state.byRunId[RUN_ID] ?? null, "import").phase).toBe("resuming");
    state = reducer(importing(), seedRunRow({ runId: RUN_ID, row: row("cancelled", "owner_died") }));
    expect(readBackgroundRun(state.byRunId[RUN_ID] ?? null, "import").phase).toBe("resuming");
  });

  it("keeps a person's own stop a cancel", () => {
    let state = reducer(importing(), ev(4, { event: "run_cancelled", reason: "graceful", steps_executed: 1, ts: "2026-10-22T19:49:00Z" }));
    state = reducer(state, seedRunRow({ runId: RUN_ID, row: row("cancelled", "user") }));
    expect(readBackgroundRun(state.byRunId[RUN_ID] ?? null, "import").phase).toBe("cancelled");
  });
});
