/**
 * A LATE notion_sync CALL IS NOT AN IMPORT (lane W2, 2026-10-21).
 *
 * A whole-Notion preview that runs on in the background is a run of the Notion IMPORT workflow, so the chat card read
 * "Notion import · The whole-Notion preview", step "Bring Notion in as tables · Finished", "0 tables made" — it looked
 * like an import that did nothing. The run now records its action (input `root` = `look:<action>`) and finishes with a
 * `look_summary`. These fail on the old card: it drew every such run as an import, and a preview ended as 0 tables.
 *
 * Fails when: a look run is read as an import; a look's report counts tables made/moved; the step keeps the import's
 * name in the run window; or a run that really is an import loses its import card or step name.
 */
import { describe, expect, it } from "@jest/globals";
import reducer, { applyRunEvent, attachRun, seedRunRow } from "@/features/workflow-runtime/redux/workflow-runs.slice";
import type { RunRow, WorkflowRunEvent } from "@/features/workflow-runtime/types";
import { relabelStepsForRun, type RunStepPresentation } from "@/features/workflow-runtime/components/run/node-presentation";
import { readBackgroundRun } from "../backgroundRun";
import { lookActionOf, lookStepTitle } from "../lookActions";

const RUN_ID = "9a1c2f0a-5b8e-4c3d-9a1f-2e6b8c4d0f99";

function event(seq: number, body: Record<string, unknown>) {
  return applyRunEvent({ runId: RUN_ID, event: { run_id: RUN_ID, step: 1, attempt: 1, ...body } as unknown as WorkflowRunEvent, seq, replay: false });
}

function runOf(actions: ReturnType<typeof event>[], row: Partial<RunRow>) {
  let state = reducer(reducer(undefined, { type: "@@INIT" }), attachRun({ runId: RUN_ID }));
  for (const action of actions) state = reducer(state, action);
  state = reducer(state, seedRunRow({
    runId: RUN_ID,
    row: { id: RUN_ID, definition_id: "d", status: "running", input: null, output: null, error: null,
      created_at: "2026-10-21T10:00:00Z", completed_at: null, metadata: null, conversation_id: null, ...row },
  }));
  return state.byRunId[RUN_ID]!;
}

const started = [
  event(1, { event: "run_started", ts: "2026-10-21T10:00:00Z" }),
  event(2, { event: "node_started", node_id: "import", spec_type: "data.notion_import", ts: "2026-10-21T10:00:01Z" }),
];

const PREVIEW_INPUT = { root: "look:preview", name: "The whole-Notion preview", onto: "{}", conversation_id: "c" };

describe("a background preview is drawn as a preview", () => {
  it("is a look, not an import, and carries the action's own title", () => {
    const run = runOf([...started, event(3, { event: "node_progress", node_id: "import", message: "Mapping your Notion: counting what is in it", ts: "2026-10-21T10:00:05Z" })],
      { input: PREVIEW_INPUT });
    const view = readBackgroundRun(run, "import");
    expect(view.kind).toBe("look");
    expect(view.name).toBe("Mapping your Notion");
    expect(view.sample?.stageIndex).toBeNull();
    expect(view.sample?.detail).toBe("Mapping your Notion: counting what is in it");
  });

  it("finished: counts what it mapped, never tables made", () => {
    const run = runOf([
      ...started,
      event(3, { event: "node_completed", node_id: "import", ts: "2026-10-21T10:01:00Z", output: {
        tables: {}, counts: {}, look: { preview_token: "t" },
        look_summary: { action: "preview", title: "Mapping your Notion", said: "", moves_something: false,
          facts: [{ label: "Top-level items found", count: 12 }, { label: "Pages", count: 40 }, { label: "Databases", count: 3 }],
          note: "Private pages under a teamspace you cannot see." } } }),
      event(4, { event: "run_completed", ts: "2026-10-21T10:01:01Z" }),
    ], { status: "completed", input: PREVIEW_INPUT });
    const view = readBackgroundRun(run, null);
    expect(view.phase).toBe("finished");
    expect(view.report).toEqual({
      kind: "look", action: "preview", title: "Mapping your Notion", said: null, movesSomething: false,
      facts: [{ label: "Top-level items found", count: 12 }, { label: "Pages", count: 40 }, { label: "Databases", count: 3 }],
      note: "Private pages under a teamspace you cannot see.",
    });
    expect(JSON.stringify(view.report).toLowerCase()).not.toContain("tables made");
  });

  it("a run started before the action was recorded still reads as a look", () => {
    expect(lookActionOf({ root: "look" })).toBe("sync");
    const legacy = readBackgroundRun(runOf(started, { input: { root: "look", name: "The whole-Notion preview" } }), null);
    expect(legacy.kind).toBe("look");
    expect(legacy.name).toBe("The whole-Notion preview");
  });
});

describe("a real import keeps its card", () => {
  it("an import root is an import", () => {
    expect(lookActionOf({ root: "https://www.notion.so/abc" })).toBeNull();
    expect(lookStepTitle({ root: "https://www.notion.so/abc", name: "Players" })).toBeNull();
    expect(readBackgroundRun(runOf(started, { input: { root: "https://www.notion.so/abc", name: "Players" } }), null).kind).toBe("import");
  });
});

describe("the run window names the step by what it does", () => {
  const step = (specType: string): RunStepPresentation => ({
    nodeId: "import", label: "Bring Notion in as tables", family: "data" as RunStepPresentation["family"], iconName: null,
    outputKind: null, specType, collectsInput: false,
  });
  it("a look's step is the action, an import's stays 'Bring Notion in as tables'", () => {
    expect(relabelStepsForRun([step("data.notion_import")], PREVIEW_INPUT)[0].label).toBe("Mapping your Notion");
    expect(relabelStepsForRun([step("data.notion_import")], { root: "look:find" })[0].label).toBe("Searching your Notion");
    expect(relabelStepsForRun([step("data.notion_import")], { root: "https://www.notion.so/abc" })[0].label).toBe("Bring Notion in as tables");
    expect(relabelStepsForRun([step("data.mapped_sync")], PREVIEW_INPUT)[0].label).toBe("Bring Notion in as tables");
  });
});
