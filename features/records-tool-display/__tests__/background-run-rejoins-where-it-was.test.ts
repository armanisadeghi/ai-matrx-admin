/**
 * A REFRESH NEVER RESTARTS THE BAR (Arman, 2026-10-19).
 *
 * After a page refresh the background card rejoins its run: the adapter refolds the run's saved
 * event log (every `node_progress` it ever recorded) before following it live. Those replayed
 * events are history, not motion — the card painted each one in turn, so the bar re-walked the
 * run from "Reading" to where it was. Now the slice flags the refold (`replaying`), the card holds
 * its opening shimmer through it, and its FIRST sample is the run's real point: stage, count and
 * fill exactly where they were. Only new activity moves it after that, and the ratchet still only
 * moves forward.
 *
 * Fails when: a replayed event reaches the card as a sample (the bar animates from zero again),
 * or the rejoined card does not land on the run's last recorded stage and count.
 */
import { describe, expect, it } from "@jest/globals";
import reducer, { applyRunEvent, attachRun, setRunReplaying } from "@/features/workflow-runtime/redux/workflow-runs.slice";
import type { WorkflowRunEvent } from "@/features/workflow-runtime/types";
import { RATCHET_START, advanceRatchet, readBackgroundRun, type ProgressRatchet } from "../backgroundRun";

const RUN_ID = "3f9a1c2e-7b4d-4e6f-8a0b-1c2d3e4f5a6b";

function ev(seq: number, body: Record<string, unknown>, replay: boolean) {
  return applyRunEvent({
    runId: RUN_ID,
    event: { run_id: RUN_ID, step: 1, attempt: 1, ...body } as unknown as WorkflowRunEvent,
    seq,
    replay,
  });
}

const history = (replay: boolean) => [
  ev(1, { event: "run_started", ts: "2026-10-19T10:00:00Z", input: { root: "https://www.notion.so/x", name: "Players" } }, replay),
  ev(2, { event: "node_started", node_id: "import", spec_type: "data.notion_import", ts: "2026-10-19T10:00:01Z" }, replay),
  ev(3, { event: "node_progress", node_id: "import", message: "reading: Players", current: 5, total: 50, ts: "2026-10-19T10:00:05Z" }, replay),
  ev(4, { event: "node_progress", node_id: "import", message: "tables: Players", current: 1, total: 1, ts: "2026-10-19T10:00:20Z" }, replay),
  ev(5, { event: "node_progress", node_id: "import", message: "rows: Players", current: 200, total: 431, ts: "2026-10-19T10:01:30Z" }, replay),
];

describe("a card rejoining its run after a refresh", () => {
  it("shows nothing moving while the saved history refolds, then lands where the run is", () => {
    let state = reducer(reducer(undefined, { type: "@@INIT" }), attachRun({ runId: RUN_ID }));
    state = reducer(state, setRunReplaying({ runId: RUN_ID, replaying: true }));
    let ratchet: ProgressRatchet = RATCHET_START;
    const seenDuringReplay: ProgressRatchet[] = [];
    for (const action of history(true)) {
      state = reducer(state, action);
      const view = readBackgroundRun(state.byRunId[RUN_ID] ?? null, "import");
      expect(view.sample).toBeNull();
      expect(view.phase).toBe("opening");
      ratchet = advanceRatchet(ratchet, view.sample, false);
      seenDuringReplay.push(ratchet);
    }
    // The bar never walked: every paint during the refold is the untouched start.
    for (const at of seenDuringReplay) expect(at).toBe(RATCHET_START);

    state = reducer(state, setRunReplaying({ runId: RUN_ID, replaying: false }));
    const view = readBackgroundRun(state.byRunId[RUN_ID] ?? null, "import");
    expect(view.phase).toBe("working");
    expect(view.sample).toEqual({ stageIndex: 4, detail: "Players", current: 200, total: 431 });
    ratchet = advanceRatchet(ratchet, view.sample, false);
    // The first painted point is the run's real point: stage 4 (Rows), 200 of 431 into it.
    expect(ratchet.stageIndex).toBe(4);
    expect(ratchet.fraction).toBeCloseTo((4 + 200 / 431) / 9, 5);

    // New live activity after the rejoin still only moves the bar forward.
    state = reducer(state, ev(6, { event: "node_progress", node_id: "import", message: "columns: Players", current: 1, total: 4, ts: "2026-10-19T10:01:40Z" }, false));
    const after = advanceRatchet(ratchet, readBackgroundRun(state.byRunId[RUN_ID] ?? null, "import").sample, false);
    expect(after.stageIndex).toBe(4);
    expect(after.fraction).toBe(ratchet.fraction);
  });
});
