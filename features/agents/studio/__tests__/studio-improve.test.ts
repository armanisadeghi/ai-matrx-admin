import { canEditAgent, planImprove, runToSave } from "../improve";
import type { CandidateRun } from "@/features/agents/samples/service";

const run = (id: string, sourceFeature: string | null, userInput: string | null = "Summarize the Q3 board deck"): CandidateRun => ({
  conversationId: id,
  title: null,
  createdAt: "2026-10-10T10:00:00Z",
  sourceFeature,
  userInput,
  inputContent: [],
  variables: {},
  agentVersionId: null,
});

describe("Improve an agent I have", () => {
  it("opens on the latest real run (not a Studio try) and plans nothing to save", () => {
    const runs = [run("s1", "agent-studio"), run("r1", "chat"), run("r2", null), run("r3", "chat", null)];
    const plan = planImprove(runs);
    expect(plan.latest?.conversationId).toBe("r1");
    // Opening a run creates nothing: the plan has no "borrow" list any more.
    expect(Object.keys(plan)).toEqual(["latest"]);
  });

  it("uses Studio tries only when the agent has no other runs", () => {
    expect(planImprove([run("s1", "agent-studio")]).latest?.conversationId).toBe("s1");
    expect(planImprove([])).toEqual({ latest: null });
  });

  it("saves a run as a test case only for the run on screen, once", () => {
    const runs = [run("r1", "chat"), run("r2", "chat")];
    expect(runToSave(runs, "r2", new Set())).toMatchObject({ conversationId: "r2" });
    expect(runToSave(runs, "r2", new Set(["r2"]))).toBe("already");
    expect(runToSave(runs, "unsent", new Set())).toBeNull();
    expect(runToSave(runs, null, new Set())).toBeNull();
  });

  it("offers only agents the person can edit", () => {
    expect(canEditAgent({ isOwner: true, accessLevel: null })).toBe(true);
    expect(canEditAgent({ isOwner: false, accessLevel: "editor" })).toBe(true);
    expect(canEditAgent({ isOwner: false, accessLevel: "viewer" })).toBe(false);
    expect(canEditAgent({ isOwner: null, accessLevel: "system" })).toBe(false);
  });
});
