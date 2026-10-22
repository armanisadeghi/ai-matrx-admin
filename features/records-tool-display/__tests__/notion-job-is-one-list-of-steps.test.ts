/**
 * A WHOLE-NOTION IMPORT IS ONE LIST OF STEPS (lane UI1, 2026-10-22).
 *
 * The chat used to show three things for one import: a generic "Mapping your Notion · Working"
 * bar, chat prose asking which tables to fill, and a separate approval card. The owner asked for
 * the one step-by-step view back: every step visible from the start with its live state, the ONE
 * question answered inside it with the safe default chosen, a slowdown said on the active step,
 * and the run's own counts ("Rows 200 of 431").
 *
 * Fails when: a step is missing from the first paint, the choice's default is anything but a new
 * table of its own, a slowdown moves or hides the active step, a step jumped over is called done
 * when the finished import counted none of it, or the start look's import run is not followed.
 */
import { describe, expect, it } from "@jest/globals";
import reducer, { applyRunEvent, attachRun } from "@/features/workflow-runtime/redux/workflow-runs.slice";
import type { WorkflowRunEvent } from "@/features/workflow-runtime/types";
import {
  JOB_STEPS,
  defaultChoices,
  notionJobSteps,
  readBackgroundRun,
  readChoiceCard,
  readProgressMessage,
  startedRunOf,
  type BackgroundRunView,
  type JobInput,
} from "../backgroundRun";

const LOOK = "11111111-1111-4111-8111-111111111111";
const IMPORT = "22222222-2222-4222-8222-222222222222";

function runOf(runId: string, events: Record<string, unknown>[]) {
  let state = reducer(reducer(undefined, { type: "@@INIT" }), attachRun({ runId }));
  events.forEach((body, i) => {
    state = reducer(state, applyRunEvent({ runId, event: { run_id: runId, step: 1, attempt: 1, ...body } as unknown as WorkflowRunEvent, seq: i + 1, replay: false }));
  });
  return state.byRunId[runId] ?? null;
}

const CARD_OUTPUT = {
  preview_token: "tok-1",
  card: {
    question: "…",
    proposals: [
      { notion_id: "a".repeat(32), notion_database: "Clients", table_id: "t-clients", table_name: "Clients", why: "same name",
        choices: { fill: "fill:t-clients", replace: "replace:t-clients", new: "new" } },
      { notion_id: "b".repeat(32), notion_database: "Projects", table_id: "t-proj", table_name: "Projects", why: "similar name",
        choices: { fill: "fill:t-proj", new: "new" }, replace_refused: "Replace is not offered: it has columns Notion does not." },
    ],
  },
};

function base(over: Partial<JobInput>): JobInput {
  return { look: null, lookOutput: null, card: null, starting: false, startRefused: null, run: null, runInput: null, stageIndex: -1, remembered: {}, ...over };
}

const states = (input: JobInput) => notionJobSteps(input).map((s) => `${s.id}:${s.state}`);

describe("the whole Notion job as one list of steps", () => {
  it("shows every step from the first paint, preview working and the rest waiting", () => {
    const look = readBackgroundRun(runOf(LOOK, [
      { event: "run_started", ts: "2026-10-22T10:00:00Z", input: { root: "look:preview", name: "The whole-Notion preview" } },
      { event: "node_started", node_id: "import", ts: "2026-10-22T10:00:01Z" },
      { event: "node_progress", node_id: "import", message: "Mapping your Notion: counting what is in it", ts: "2026-10-22T10:00:02Z" },
    ]), null);
    const steps = notionJobSteps(base({ look }));
    expect(steps.map((s) => s.id)).toEqual(JOB_STEPS.map((s) => s.id));
    expect(steps.map((s) => s.id)).toEqual(["preview", "choice", "reading", "files", "tables", "columns", "rows", "views", "pages", "comments", "report"]);
    expect(steps[0]).toMatchObject({ state: "working", note: "Mapping your Notion: counting what is in it" });
    expect(steps.slice(1).every((s) => s.state === "waiting")).toBe(true);
  });

  it("asks the ONE question inside, every table defaulting to a new one of its own", () => {
    const card = readChoiceCard(CARD_OUTPUT);
    expect(card?.previewToken).toBe("tok-1");
    expect(card?.proposals.map((p) => p.options.map((o) => o.key))).toEqual([["new", "fill", "replace"], ["new", "fill"]]);
    expect(card?.proposals[1].replaceRefused).toMatch(/not offered/);
    expect(defaultChoices(card!)).toEqual({ ["a".repeat(32)]: "new", ["b".repeat(32)]: "new" });
    const look = { phase: "finished" } as BackgroundRunView;
    expect(states(base({ look, card })).slice(0, 3)).toEqual(["preview:done", "choice:needs_you", "reading:waiting"]);
    expect(states(base({ look, card, starting: true }))[1]).toBe("choice:working");
  });

  it("follows the import run a start look began", () => {
    expect(startedRunOf({ background: true, run_id: IMPORT })).toBe(IMPORT);
    expect(startedRunOf({ error: "unknown_choice", run_id: IMPORT })).toBeNull();
    expect(readChoiceCard({ background: true, run_id: IMPORT })).toBeNull();
  });

  it("counts the active stage and says a slowdown on it without moving it", () => {
    const events = [
      { event: "run_started", ts: "2026-10-22T10:00:00Z", input: { root: "x\ny", name: "Whole workspace", onto: JSON.stringify({ workspace: true, fill: { ["a".repeat(32)]: "t-clients" } }) } },
      { event: "node_started", node_id: "import", ts: "2026-10-22T10:00:01Z" },
      { event: "node_progress", node_id: "import", message: "tables: Clients", current: 41, total: 278, ts: "2026-10-22T10:01:00Z" },
    ];
    const run = readBackgroundRun(runOf(IMPORT, events), null);
    const runInput = { onto: JSON.stringify({ workspace: true, fill: { ["a".repeat(32)]: "t-clients" } }) };
    const steps = notionJobSteps(base({ run, runInput, stageIndex: 2 }));
    expect(steps.find((s) => s.id === "tables")).toMatchObject({ state: "working", current: 41, total: 278, held: false });
    expect(steps.find((s) => s.id === "choice")).toMatchObject({ state: "done" });
    expect(steps.filter((s) => s.state === "done").map((s) => s.id)).toEqual(["preview", "choice", "reading", "files"]);

    const slow = readBackgroundRun(runOf(IMPORT, [...events,
      { event: "node_progress", node_id: "import", message: "waiting: Notion asked us to slow down; going on in 30s", current: 0, total: 1, ts: "2026-10-22T10:01:10Z" }]), null);
    expect(readProgressMessage("import", "waiting: Notion asked us to slow down")).toEqual({ stageIndex: null, detail: "Notion asked us to slow down", waiting: true });
    const held = notionJobSteps(base({ run: slow, runInput, stageIndex: 2, remembered: { 2: { current: 41, total: 278 } } }));
    expect(held.find((s) => s.id === "tables")).toMatchObject({ state: "working", held: true, note: "Notion asked us to slow down; going on in 30s", current: 41, total: 278 });
  });

  it("calls a stage the finished import never reached and counted none of skipped, with the reason", () => {
    const run = {
      phase: "finished", sample: null, stoppedBecause: null,
      report: { kind: "import", tableIds: ["t1"], counts: [{ label: "rows", count: 12 }, { label: "pages", count: 3 }], different: [], notCarried: [], reportTableId: "r1" },
    } as unknown as BackgroundRunView;
    const steps = notionJobSteps(base({ run, runInput: { onto: JSON.stringify({ workspace: true }) }, stageIndex: 8, remembered: { 1: { current: 4, total: 4 } } }));
    expect(steps.find((s) => s.id === "files")).toMatchObject({ state: "done", current: 4 });
    expect(steps.find((s) => s.id === "views")).toMatchObject({ state: "skipped", note: "No views to bring" });
    expect(steps.find((s) => s.id === "comments")).toMatchObject({ state: "skipped", note: "No comments to bring" });
    expect(steps.find((s) => s.id === "choice")).toMatchObject({ state: "skipped", note: "Nothing of yours is touched" });
    expect(steps.filter((s) => s.state === "done").map((s) => s.id)).toEqual(["preview", "reading", "files", "tables", "columns", "rows", "pages", "report"]);
  });
});
