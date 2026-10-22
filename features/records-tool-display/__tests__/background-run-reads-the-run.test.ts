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
  STALLED_AFTER_MS,
  STATUS_WORD,
  advanceRatchet,
  quietNote,
  readBackgroundRun,
  readProgressMessage,
  stepLabel,
  workflowStages,
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
    expect(readProgressMessage("import", "columns: Players · Team")).toEqual({ stageIndex: 3, detail: "Players · Team" });
    expect(readProgressMessage("import", "report: 1")).toEqual({ stageIndex: 8, detail: "1" });
  });

  it("the file stage sits between reading and tables, and moves the bar only within its own share", () => {
    // aidream mcp_walker.fetch_files: "files: Fetching files: N of M" (live, 2026-10-19: unknown, it filled the bar to 99%)
    expect(readProgressMessage("import", "files: Fetching files: 30 of 40")).toEqual({ stageIndex: 1, detail: "Fetching files: 30 of 40" });
    const sample = { ...readProgressMessage("import", "files: Fetching files: 40 of 40"), current: 40, total: 40 };
    const at = advanceRatchet(RATCHET_START, sample, false);
    expect(at.stageIndex).toBe(1);
    expect(at.fraction).toBeCloseTo(2 / IMPORT_STAGES.length);
    const tables = advanceRatchet(at, { ...readProgressMessage("import", "tables: Players"), current: 1, total: 4 }, false);
    expect(tables.fraction).toBeGreaterThan(at.fraction);
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
    const steps = walk([sample(4, 10, 10), sample(3, 1, 4)]);
    expect(steps[1].stageIndex).toBe(4);
    expect(steps[1].fraction).toBe(steps[0].fraction);
  });

  it("nothing moving returns the same object, and finishing fills the bar", () => {
    const at = advanceRatchet(RATCHET_START, sample(1, 1, 2), false);
    expect(advanceRatchet(at, sample(1, 1, 2), false)).toBe(at);
    expect(advanceRatchet(at, null, false)).toBe(at);
    expect(advanceRatchet(at, null, true)).toEqual({ stageIndex: IMPORT_STAGES.length - 1, fraction: 1 });
  });

  it("the bar never claims done before the run says so", () => {
    expect(advanceRatchet(RATCHET_START, sample(IMPORT_STAGES.length - 1, 1, 1), false).fraction).toBeLessThan(1);
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
    expect(view.sample).toEqual({ stageIndex: 4, detail: "Players", current: 47, total: 431 });
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

// ── any agent-started workflow run (workflow_run, 2026-10-18) ───────────────────

describe("a generic workflow run: stages from its steps", () => {
  const steps = [
    event(1, { event: "run_started", ts: "2026-10-18T10:00:00Z" }),
    event(2, { event: "node_started", node_id: "fetch", spec_type: "http.request", ts: "2026-10-18T10:00:01Z" }),
    event(3, { event: "node_completed", node_id: "fetch", output: { body: "x" }, ts: "2026-10-18T10:00:02Z" }),
    event(4, { event: "node_started", node_id: "sum", spec_type: "data.sum_values", ts: "2026-10-18T10:00:03Z" }),
  ];

  it("working: one stage per step started, the live step named, and the bar only moves forward", () => {
    const run = runOf([...steps, event(5, { event: "node_progress", node_id: "sum", message: "adding 3 of 9", current: 3, total: 9, ts: "2026-10-18T10:00:04Z" })]);
    const view = readBackgroundRun(run, "workflow");
    expect(view.kind).toBe("workflow");
    expect(view.phase).toBe("working");
    expect(workflowStages(run)).toEqual([{ id: "fetch", label: "Request" }, { id: "sum", label: "Sum values" }]);
    expect(view.sample).toEqual({ stageIndex: 1, detail: "adding 3 of 9", current: 3, total: 9 });
    const forward = advanceRatchet(RATCHET_START, view.sample, false, 2);
    // a third step appears: the bar is measured against more steps but never shrinks
    expect(advanceRatchet(forward, { ...view.sample!, current: 3 }, false, 3)).toBe(forward);
  });

  it("finished: the steps done and the output's keys", () => {
    const run = runOf([
      ...steps,
      event(5, { event: "node_completed", node_id: "sum", output: { total: 42 }, ts: "2026-10-18T10:00:05Z" }),
      event(6, { event: "run_completed", ts: "2026-10-18T10:00:06Z" }),
    ]);
    const view = readBackgroundRun(run, "workflow");
    expect(view.phase).toBe("finished");
    expect(view.report).toEqual({ kind: "workflow", steps: 2, outputKeys: ["total"] });
  });

  it("a step's label reads as words", () => {
    expect(stepLabel("data.mapped_sync", "sync")).toBe("Mapped sync");
    expect(stepLabel(null, "my-step")).toBe("My step");
  });
});

// ── parked, stalled and canceled runs (adversarial I8, I9, M1) ──────────────────

describe("a run that is not simply working", () => {
  it("a run parked on a question is Waiting on you, with its ask", () => {
    const run = runOf([
      ...started,
      event(3, { event: "run_interrupted", node_id: "import", checkpoint_id: "c1", payload: { question: "Which workspace should this go in?" }, ts: "2026-10-17T10:01:00Z" }),
    ]);
    const view = readBackgroundRun(run, "import");
    expect(view.phase).toBe("needs_you");
    expect(STATUS_WORD[view.phase]).toBe("Waiting on you");
    expect(view.ask).toBe("Which workspace should this go in?");
  });

  it("a paused run is never drawn as Working", () => {
    const paused = readBackgroundRun(runOf([...started, event(3, { event: "run_paused", ts: "2026-10-17T10:01:00Z" })]), "import");
    expect(paused.phase).toBe("paused");
    expect(STATUS_WORD[paused.phase]).toBe("Paused");
  });

  it("a cancel the person made is Canceled, not a failure", () => {
    const run = runOf([...started, event(3, { event: "run_cancelled", ts: "2026-10-17T10:01:00Z" })]);
    const view = readBackgroundRun(run, "import");
    expect(view.phase).toBe("cancelled");
    expect(view.stoppedBecause).toBeNull();
    expect(view.endedAt).not.toBeNull();
  });

  it("the same states read the same for a generic workflow run", () => {
    const park = event(3, { event: "run_interrupted", node_id: "import", checkpoint_id: "c1", payload: {}, ts: "2026-10-17T10:01:00Z" });
    expect(readBackgroundRun(runOf([...started, park]), "workflow").phase).toBe("needs_you");
    expect(readBackgroundRun(runOf([...started, event(3, { event: "run_cancelled", ts: "2026-10-17T10:01:00Z" })]), "workflow").phase).toBe("cancelled");
  });

  it("a long quiet states the quiet time, never a claim about workers", () => {
    const view = { phase: "working" as const, readFailure: null };
    const fmt = (ms: number) => `${Math.round(ms / 1000)}s`;
    expect(quietNote(view, 5_000, fmt)).toBe("");
    expect(quietNote(view, 60_000, fmt)).toBe("Still working · last moved 60s ago");
    expect(quietNote(view, STALLED_AFTER_MS, fmt)).toBe("No progress for 300s");
    expect(quietNote(view, STALLED_AFTER_MS, fmt)).not.toMatch(/worker/i);
    expect(quietNote({ phase: "needs_you", readFailure: null }, STALLED_AFTER_MS * 4, fmt)).toBe("");
    expect(quietNote({ phase: "working", readFailure: "Could not read the run." }, STALLED_AFTER_MS, fmt)).toBe("Could not read the run.");
  });

  it("a durable timer park is Waiting with its wake time, not a question for the person", () => {
    const run = runOf([
      ...started,
      event(3, { event: "run_interrupted", node_id: "import", checkpoint_id: "c1", payload: { matrx_sleep: { wake_at: "2026-10-18T15:40:00+00:00" } }, ts: "2026-10-17T10:01:00Z" }),
    ]);
    const view = readBackgroundRun(run, "workflow");
    expect(view.phase).toBe("sleeping");
    expect(STATUS_WORD[view.phase]).toBe("Waiting");
    expect(view.wakeAt).toBe("2026-10-18T15:40:00+00:00");
    expect(view.ask).toBeNull();
  });
});
