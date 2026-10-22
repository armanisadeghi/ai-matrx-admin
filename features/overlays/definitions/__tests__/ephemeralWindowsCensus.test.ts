/**
 * EPHEMERAL WINDOWS CENSUS (Arman, 2026-10-21: reloading the same tab restores its windows).
 *
 * A window is remembered by default (summon `core/preservation.ts`: every JSON open-data key except
 * handle ids rides with it, plus its dragged rect on this device). `window.ephemeral: true` or
 * `window.preservation: false` opts a window OUT of both, so it is only for true one-shots whose
 * purpose dies with the page that opened them. Every one is listed here with a one-word reason;
 * a new one without a line fails this test, and so does a line whose window is no longer one-shot.
 *
 * Reasons:
 *   picker   — returns a choice to the opener through a handle that does not survive a reload
 *   callback — exists to hand a result back to the opener (a callback group / live handle)
 *   consent  — a connector consent step owned by the flow that opened it
 *   gate     — stands in front of one run; the run is gone after a reload
 *   confirm  — a confirmation; reappearing would re-ask a settled question
 *   watch    — a live view of one run; the page's run ids survive a reload in sessionStorage and the
 *              debug auto-open raises the view again, so a restored copy would be a second one
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

type Reason = "picker" | "callback" | "consent" | "gate" | "confirm" | "watch";

const EPHEMERAL: Record<string, Reason> = {
  agentPickerWindow: "picker",
  curatedIconPickerWindow: "picker",
  directiveReferencePickerWindow: "picker",
  resourcePickerWindow: "picker",
  storageSourcePicker: "picker",
  createBrandWindow: "callback",
  createProjectWindow: "callback",
  extractionCellEditorWindow: "callback",
  imageAnnotationWindow: "callback",
  imageUploaderWindow: "callback",
  marketingMediaAssetWindow: "callback",
  masterworkAddRuleWindow: "callback",
  masterworkBuildWindow: "callback",
  multiFileSmartCodeEditorWindow: "callback",
  smartCodeEditorWindow: "callback",
  sourceReviewWindow: "callback",
  surfaceAgentBindWindow: "callback",
  googleConnectWindow: "consent",
  contextAssignment: "picker",
  agentGateWindow: "gate",
  changeReviewWindow: "confirm",
  setContextValueWindow: "confirm",
  userSearchWindow: "picker",
  aiWatchWindow: "watch",
  workflowRunWindow: "watch",
  alchemyPrepareWindow: "callback",
};

const DIR = join(__dirname, "..");

function ephemeralIdsOnDisk(): string[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith(".definition.tsx") || f.endsWith(".definition.ts"))
    .filter((f) => /\bephemeral:\s*true\b|\bpreservation:\s*false\b/.test(readFileSync(join(DIR, f), "utf8")))
    .map((f) => f.replace(/\.definition\.tsx?$/, ""))
    .sort();
}

describe("ephemeral windows census", () => {
  it("every ephemeral window is a listed one-shot with a reason", () => {
    const unlisted = ephemeralIdsOnDisk().filter((id) => !(id in EPHEMERAL));
    expect(unlisted).toEqual([]);
  });

  it("every listed one-shot is still ephemeral (remove the line when a window becomes restorable)", () => {
    const onDisk = new Set(ephemeralIdsOnDisk());
    const stale = Object.keys(EPHEMERAL).filter((id) => !onDisk.has(id));
    expect(stale).toEqual([]);
  });
});
