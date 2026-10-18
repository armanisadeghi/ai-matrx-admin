/**
 * A BACKGROUND COPY IS DRAWN FROM ITS RUN, AND ITS BAR ONLY MOVES FORWARD (2026-10-17).
 *
 * The `records` tool's `notion_sync` starts a Notion import (or a mapped copy) as a durable
 * workflow run and answers only its `run_id`. The chat drew that answer as the generic card; the
 * live card now reads the run itself: the answer reader names a BACKGROUND answer, the run's
 * `node_progress` (folded by the real workflowRuns reducer) becomes a named stage + a detail line,
 * and the stage strip / bar RATCHET — the importer's total grows while reading discovers pages and
 * a late "columns" pass follows "rows", and neither may pull the bar back.
 *
 * Fails when: a `run_id` answer stops being read as a background run (or another records answer
 * starts being read as one); progress loses its timestamp ("last moved Xs ago" would be invented);
 * a growing total or a late stage moves the bar backwards; a finished run's report or a stopped
 * run's sentence stops reaching the card.
 */
import { describe, expect, it } from "@jest/globals";
import reducer, { applyRunEvent, attachRun, seedRunRow } from "@/features/workflow-runtime/redux/workflow-runs.slice";
import type { RunRow, WorkflowRunEvent } from "@/features/workflow-runtime/types";
import { readRecordsAnswer } from "../readRecordsAnswer";
import {
  IMPORT_STAGES,
  RATCHET_START,
  advanceRatchet,
  readBackgroundRun,
  readProgressMessage,
  type ProgressRatchet,
  type ProgressSample,
} from "../backgroundRun";

const RUN_ID = "7d1c2f0a-5b8e-4c3d-9a1f-2e6b8c4d0f13";
const TABLE_A = "0b5f7a2c-1d3e-4f60-8a9b-c1d2e3f4a5b6";
const TABLE_B = "1c6a8b3d-2e4f-4071-9bac-d2e3f4a5b6c7";

describe("the answer reader", () => {
  it("reads an import start as a background run", () => {
    const answer = readRecordsAnswer({
      action: "notion_sync",
      applied: false,
      report: { background: true, run_id: RUN_ID, status: "queued", message: "Bringing it in, in the background.", what_to_do: "…" },
    });
    expect(answer).toEqual({ kind: "background", runId: RUN_ID, run: null });
  });

  it("reads a status read of the same run as the same card", () => {
    const answer = readRecordsAnswer({
      action: "notion_sync",
      applied: false,
      report: { run_id: RUN_ID, status: "running", running_for_seconds: 40, now_doing: "rows: Players", done: 12, of: 40 },
    });
    expect(answer).toEqual({ kind: "background", runId: RUN_ID, run: null });
  });

  it("a mapped copy started through data_sync is a copy", () => {
    expect(readRecordsAnswer({ action: "data_sync", report: { background: true, run_id: RUN_ID } }))
      .toEqual({ kind: "background", runId: RUN_ID, run: "copy" });
  });

  it("never reads other answers as a run", () => {
    // a run that cannot be found, a finished foreground copy, a lookup, a record write
    expect(readRecordsAnswer({ action: "notion_sync", report: { error: "not_found", run_id: RUN_ID, status: "x" } })?.kind).not.toBe("background");
    expect(readRecordsAnswer({ action: "notion_sync", applied: true, report: { added: 3, updated: 1 } })?.kind).not.toBe("background");
    expect(readRecordsAnswer({ action: "notion_sync", applied: false, found: { databases: [] } })?.kind).not.toBe("background");
    expect(readRecordsAnswer({ action: "record_write", run_id: RUN_ID, background: true, status: "x" })?.kind).not.toBe("background");
    expect(readRecordsAnswer({ action: "notion_sync", report: { background: true, run_id: "not-a-run" } })?.kind).not.toBe("background");
  });
});

describe("the progress line", () => {
  it("names the importer's stage and keeps its detail", () => {
    expect(readProgressMessage("import", "reading: FULFILLMENT WORKFLOW")).toEqual({ stageIndex: 0, detail: "FULFILLMENT WORKFLOW" });
    expect(readProgressMessage("import", "columns: Players · Team")).toEqual({ stageIndex: 2, detail: "Players · Team" });
    expect(readProgressMessage("import", "report: 1")).toEqual({ stageIndex: 5, detail: "1" });
  });

  it("a copy's slice line is all detail", () => {
    expect(readProgressMessage("copy", "Slice 2: 40 added, 3 updated so far")).toEqual({
      stageIndex: null,
      detail: "Slice 2: 40 added, 3 updated so far",
    });
  });
});

describe("the ratchet", () => {
  const sample = (stageIndex: number, current: number, total: number): ProgressSample => ({ stageIndex, detail: null, current, total });
  const walk = (samples: ProgressSample[]): ProgressRatchet[] => {
    const out: ProgressRatchet[] = [];
    let at = RATCHET_START;
    for (const next of samples) {
      at = advanceRatchet(at, next, false);
      out.push(at);
    }
    return out;
  };

  it("a total that grows while reading never pulls the bar back", () => {
    const steps = walk([sample(0, 40, 50), sample(0, 47, 431), sample(0, 200, 431), sample(0, 431, 431)]);
    const fills = steps.map((step) => step.fraction);
    for (let i = 1; i < fills.length; i++) expect(fills[i]).toBeGreaterThanOrEqual(fills[i - 1]);
    // 47 of 431 is behind 40 of 50: it holds rather than dropping
    expect(fills[1]).toBe(fills[0]);
  });

  it("a late columns pass after rows keeps the strip on rows", () => {
    const steps = walk([sample(3, 10, 10), sample(2, 1, 4)]);
    expect(steps[1].stageIndex).toBe(3);
    expect(steps[1].fraction).toBe(steps[0].fraction);
  });

  it("nothing moving returns the same object, and finishing fills the bar", () => {
    const at = advanceRatchet(RATCHET_START, sample(1, 1, 2), false);
    expect(advanceRatchet(at, sample(1, 1, 2), false)).toBe(at);
    expect(advanceRatchet(at, null, false)).toBe(at);
    expect(advanceRatchet(at, null, true)).toEqual({ stageIndex: IMPORT_STAGES.length - 1, fraction: 1 });
  });

  it("the bar never claims done before the run says so", () => {
    expect(advanceRatchet(RATCHET_START, sample(5, 1, 1), false).fraction).toBeLessThan(1);
  });
});

// ── the run, folded by the real reducer ─────────────────────────────────────────

function event(seq: number, body: Record<string, unknown>) {
  return applyRunEvent({
    runId: RUN_ID,
    event: { run_id: RUN_ID, step: 1, attempt: 1, ...body } as unknown as WorkflowRunEvent,
    seq,
    replay: false,
  });
}

function runOf(actions: ReturnType<typeof event>[], row?: Partial<RunRow>) {
  let state = reducer(reducer(undefined, { type: "@@INIT" }), attachRun({ runId: RUN_ID }));
  for (const action of actions) state = reducer(state, action);
  if (row) {
    state = reducer(state, seedRunRow({
      runId: RUN_ID,
      row: {
        id: RUN_ID, definition_id: "d", status: "running", input: null, output: null, error: null,
        created_at: "2026-10-17T10:00:00Z", completed_at: null, metadata: null, conversation_id: null, ...row,
      },
    }));
  }
  const run = state.byRunId[RUN_ID];
  if (!run) throw new Error("the run was not attached");
  return run;
}

const started = [
  event(1, { event: "run_started", ts: "2026-10-17T10:00:00Z" }),
  event(2, { event: "node_started", node_id: "import", spec_type: "data.notion_import", ts: "2026-10-17T10:00:01Z" }),
];

describe("the card's view of a real run", () => {
  it("working: the stage, the detail, the count and when it last moved", () => {
    const run = runOf(
      [...started, event(3, { event: "node_progress", node_id: "import", message: "rows: Players", current: 47, total: 431, ts: "2026-10-17T10:01:30Z" })],
      { input: { root: "https://www.notion.so/abc", name: "Players", conversation_id: "" } },
    );
    const view = readBackgroundRun(run, null);
    expect(view.kind).toBe("import");
    expect(view.phase).toBe("working");
    expect(view.name).toBe("Players");
    expect(view.sample).toEqual({ stageIndex: 3, detail: "Players", current: 47, total: 431 });
    expect(view.lastMovedAt).toBe("2026-10-17T10:01:30Z");
  });

  it("finished (a reopened conversation): the report, at once", () => {
    const run = runOf([
      ...started,
      event(3, {
        event: "node_completed",
        node_id: "import",
        ts: "2026-10-17T10:04:00Z",
        output: {
          tables: { n1: TABLE_A, n2: TABLE_B },
          counts: { rows: 431, pages: 12, views: 0 },
          came_over: {},
          came_with_a_difference: [{ kind: "property", item: "Players · Rating", reason: "a formula became a number", status: "different" }],
          not_carried: [{ kind: "block", item: "Embed", reason: "embeds have no table form", status: "lost" }],
          top_pages: [],
          report_table_id: TABLE_B,
        },
      }),
      event(4, { event: "run_completed", ts: "2026-10-17T10:04:01Z" }),
    ]);
    const view = readBackgroundRun(run, "import");
    expect(view.phase).toBe("finished");
    expect(view.endedAt).toBe("2026-10-17T10:04:01Z");
    expect(view.report).toEqual({
      kind: "import",
      tableIds: [TABLE_A, TABLE_B],
      counts: [{ label: "rows", count: 431 }, { label: "pages", count: 12 }],
      different: [{ kind: "property", item: "Players · Rating", reason: "a formula became a number" }],
      notCarried: [{ kind: "block", item: "Embed", reason: "embeds have no table form" }],
      reportTableId: TABLE_B,
    });
  });

  it("stopped: the server's own sentence", () => {
    const run = runOf([
      ...started,
      event(3, { event: "node_failed", node_id: "import", ts: "2026-10-17T10:02:00Z", error_type: "import_failed", error_message: "Notion is not connected for this person." }),
      event(4, { event: "run_failed", ts: "2026-10-17T10:02:01Z", error_message: "Notion is not connected for this person." }),
    ]);
    const view = readBackgroundRun(run, "import");
    expect(view.phase).toBe("stopped");
    expect(view.stoppedBecause).toBe("Notion is not connected for this person.");
  });

  it("a mapped copy: per-table counts from the last slice", () => {
    const run = runOf(
      [
        event(1, { event: "run_started", ts: "2026-10-17T10:00:00Z" }),
        event(2, { event: "node_started", node_id: "sync", spec_type: "data.mapped_sync", ts: "2026-10-17T10:00:01Z" }),
        event(3, {
          event: "node_completed",
          node_id: "sync",
          ts: "2026-10-17T10:03:00Z",
          output: {
            finished: true, slices: 2, added: 40, updated: 3, archived: 1, conflicts: [{ source_id: "x", column: "y" }], error: null,
            summary: { jobs: [{ job: "players", table: "Players", table_id: TABLE_A, created: 38, adopted: 2, updated: 3, archived: 1 }] },
          },
        }),
        event(4, { event: "run_completed", ts: "2026-10-17T10:03:01Z" }),
      ],
      { status: "completed", input: { map: { name: "Players sync" }, source: "auto" } },
    );
    const view = readBackgroundRun(run, null);
    expect(view.kind).toBe("copy");
    expect(view.name).toBe("Players sync");
    expect(view.report).toEqual({
      kind: "copy", added: 40, updated: 3, archived: 1, conflicts: 1, finished: true,
      perTable: [{ tableId: TABLE_A, name: "Players", added: 40, updated: 3, archived: 1 }],
    });
  });

  it("before the server says anything, the card says it is opening — never 'queued'", () => {
    expect(readBackgroundRun(runOf([]), "import").phase).toBe("opening");
  });
});
