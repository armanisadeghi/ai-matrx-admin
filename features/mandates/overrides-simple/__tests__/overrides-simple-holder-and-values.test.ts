/**
 * The simple Overrides tab shows the settings of the agent that ACTUALLY runs,
 * and names the agent that actually runs.
 *
 * Defect 1 (review of the mandate window, 2026-09-24): a person's own level
 * almost never names an agent — the job resolves through a lower rung — and
 * the tab said "No agent is set for this job yet." while an agent ran.
 * (Defect 6 — an unset agent setting printed as the model's default — is now
 * THE model-settings panel's "Not set · Model default: X" row, tested in
 * `@ai-matrx/agents` `settings/react/model-settings-panel.test.tsx`.)
 */
import type { HolderDraft } from "@/features/bindings/ScopeHolderBar";
import type { MandateWorkspaceData } from "@/features/mandates/workspace/useMandateWorkspaceData";
import {
  holderChoiceForSave,
  holderDraftOf,
  overridesHolderOf,
} from "../binding-lookup";

const data = { versionsById: {} } as unknown as MandateWorkspaceData;
const RESOLVED = "11111111-1111-4111-8111-111111111111";

describe("which agent's settings the person level shows", () => {
  const noOwnHolder: HolderDraft = holderDraftOf(null);

  it("a person with no binding sees the agent the server resolved", () => {
    const picked = overridesHolderOf(noOwnHolder, "user", data, {
      status: "ready",
      agentId: RESOLVED,
      versionId: null,
    });
    expect(picked.source).toBe("resolved");
    expect(picked.source === "resolved" && picked.holder.agentId).toBe(RESOLVED);
  });

  it("waits for the verdict instead of saying nobody runs it", () => {
    expect(
      overridesHolderOf(noOwnHolder, "user", data, { status: "loading" }).source,
    ).toBe("loading");
  });

  it("the person's own chosen agent still wins over the verdict", () => {
    const own: HolderDraft = {
      kind: "agent",
      agentId: "own-agent",
      agentVersionId: null,
      useLatest: true,
      workflowId: null,
    };
    const picked = overridesHolderOf(own, "user", data, {
      status: "ready",
      agentId: RESOLVED,
      versionId: null,
    });
    expect(picked).toEqual({ source: "own", holder: own });
  });

  it("saving from a resolved agent writes a settings-only record (who runs keeps following the lower rung)", () => {
    const picked = overridesHolderOf(noOwnHolder, "user", data, {
      status: "ready",
      agentId: RESOLVED,
      versionId: null,
    });
    expect(
      holderChoiceForSave({ picked, agentId: RESOLVED, bindAgentId: null }),
    ).toEqual({ agentId: null, agentVersionId: null, useLatest: true });
  });
});
