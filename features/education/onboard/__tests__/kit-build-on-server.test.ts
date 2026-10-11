// THE SERVER BUILDS THE KIT (2026-10-11).
//
// A study kit's outputs used to be merged and SAVED inside the browser tab
// (`convertMany` + `recordSourceLineage` in useKitGeneration): lock the phone
// or close the tab mid-build and the deck, quiz, notes or audio were lost or
// orphaned. These guards hold the move:
//
// 1. The kit hook never saves an output itself — no converter fan-out, no
//    lineage writer, no row service. It starts ONE server run and watches it.
// 2. That run is the `education_kit_build` system workflow about `kit:<id>`,
//    detached (it finishes with no page open), carrying everything the server
//    needs to make and save every output — including the build id a
//    continuation rejoins.
// 3. The board's rows come from the run: a saved step is a ready output with
//    its link, a failed step names the server's reason, and a run that ended
//    with an output still unmade says so instead of spinning forever.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { WorkflowRunState } from "@/features/workflow-runtime/redux/workflow-runs.slice";
import type { KitTargetState } from "../types";

const calls: unknown[] = [];
jest.mock("@/lib/api/call-api", () => ({
  callApi: (args: unknown) => {
    calls.push(args);
    return { __thunk: true };
  },
}));

import { kitTargetsFromRun, startKitBuild } from "../kitBuildService";

const KIT = "748fcb0c-210d-4f6c-ac26-8afecf301e93";

describe("the kit hook never saves an output in the tab", () => {
  const source = readFileSync(join(__dirname, "..", "useKitGeneration.ts"), "utf8");
  it.each([
    "convertMany",
    "useContentConverter",
    "recordSourceLineage",
    "announceLineage",
    "fcService",
    "assessmentService",
    "studyMediaService",
  ])("does not use %s", (name) => {
    expect(source).not.toContain(name);
  });
  it("starts the server build and watches it", () => {
    expect(source).toContain("startKitBuild(");
    expect(source).toContain("useWorkflowRun(runId)");
    expect(source).toContain("useFloatingWorkflowRun(");
  });
});

describe("starting the server build", () => {
  beforeEach(() => {
    calls.length = 0;
  });
  it("asks the system lane for education_kit_build about the kit, detached, with everything it needs", async () => {
    const dispatch = jest.fn(async () => ({ data: { run_id: "run-1", mode: "queued" }, error: null }));
    const started = await startKitBuild(dispatch as never, {
      kitId: KIT,
      organizationId: "org-1",
      buildId: "build-1",
      sourceSet: { sources: [{ resource_type: "note", resource_id: KIT }] } as never,
      targets: ["deck", "audio"],
      options: { depth: "thorough", count: 30, focus: "mitosis" },
      title: "Cell Biology",
    });
    expect(started).toEqual({ runId: "run-1", duplicate: false });
    const args = calls[0] as Record<string, unknown>;
    expect(args.path).toBe("/workflows/system/{key}/runs");
    expect(args.method).toBe("POST");
    expect(args.pathParams).toEqual({ key: "education_kit_build" });
    expect(args.scopeOverrides).toEqual({ organization_id: "org-1" });
    const body = args.body as Record<string, unknown>;
    expect(body.subject).toBe(`kit:${KIT}`);
    expect(body.mode).toBe("detached");
    expect(body.inputs).toMatchObject({
      kit_id: KIT,
      build_id: "build-1",
      targets: ["deck", "audio"],
      title: "Cell Biology",
      depth: "thorough",
      count: 30,
      focus: "mitosis",
    });
  });
  it("rejoins an active build instead of starting a second", async () => {
    const dispatch = jest.fn(async () => ({ data: { run_id: "run-1", mode: "duplicate" }, error: null }));
    const started = await startKitBuild(dispatch as never, {
      kitId: KIT,
      organizationId: "org-1",
      buildId: "build-1",
      sourceSet: { sources: [] } as never,
      targets: ["deck"],
      options: {},
      title: "Kit",
    });
    expect(started.duplicate).toBe(true);
  });
});

describe("the board reads the server run", () => {
  const base: KitTargetState[] = [
    { targetKind: "deck", label: "Flashcard deck", status: "running" },
    { targetKind: "quiz", label: "Quiz", status: "running" },
    { targetKind: "notes", label: "Notes", status: "running" },
    { targetKind: "audio", label: "Audio overview", status: "running" },
  ];
  const node = (nodeId: string, patch: Record<string, unknown>) => ({
    invocationKey: `${nodeId}:0`,
    nodeId,
    specType: "education.kit_build_output",
    dispatchId: null,
    itemIndex: 0,
    attempt: 1,
    phase: "running",
    startedAt: "2026-10-11T10:00:00.000Z",
    durationMs: null,
    output: null,
    error: null,
    progress: null,
    ...patch,
  });
  const run = {
    status: "running",
    nodeAggregates: {
      deck: { nodeId: "deck", specType: null, invocationKeys: ["deck:0"], expectedCount: 1 },
      quiz: { nodeId: "quiz", specType: null, invocationKeys: ["quiz:0"], expectedCount: 1 },
      notes: { nodeId: "notes", specType: null, invocationKeys: ["notes:0"], expectedCount: 1 },
    },
    nodes: {
      "deck:0": node("deck", {
        phase: "settled",
        durationMs: 5_000,
        output: {
          artifacts: [
            {
              artifact_id: "set-1",
              artifact_type: "fc_set",
              href: "/education/flashcards/set-1",
              title: "Cell Biology",
              detail: "24 cards",
            },
          ],
        },
      }),
      "quiz:0": node("quiz", { phase: "failed", error: { type: null, message: "usage limit reached" } }),
      "notes:0": node("notes", { progress: { message: "Notes: section 2 of 5", fraction: null, current: 2, total: 5 } }),
    },
  } as unknown as WorkflowRunState;

  it("maps saved, failed and running steps onto the rows", () => {
    const [deck, quiz, notes, audio] = kitTargetsFromRun(run, base, 0);
    expect(deck).toMatchObject({ status: "success", artifactId: "set-1", href: "/education/flashcards/set-1", detail: "24 cards" });
    expect(deck.finishedAt! - deck.startedAt!).toBe(5_000);
    expect(quiz).toMatchObject({ status: "error", error: "usage limit reached" });
    expect(notes).toMatchObject({ status: "running", coverage: { done: 2, total: 5 } });
    expect(audio.status).toBe("running");
  });
  it("never leaves a row spinning once the run is over", () => {
    const rows = kitTargetsFromRun(run, base, 0, true);
    expect(rows.find((r) => r.targetKind === "audio")?.status).toBe("error");
    expect(rows.find((r) => r.targetKind === "deck")?.status).toBe("success");
  });
});
