import { canEditAgent, planImprove } from "../improve";
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
  it("opens on the latest real run and turns recent real runs (not Studio tries) into new test cases", () => {
    const runs = [run("s1", "agent-studio"), run("r1", "chat"), run("r2", null), run("r3", "chat", null), run("r4", "chat")];
    const plan = planImprove(runs, new Set(["r2"]), 3);
    expect(plan.latest?.conversationId).toBe("r1");
    // r3 has no input (nothing to re-run), r2 already is a case, s1 is a Studio try.
    expect(plan.borrow.map((r) => r.conversationId)).toEqual(["r1", "r4"]);
  });

  it("uses Studio tries only when the agent has no other runs", () => {
    expect(planImprove([run("s1", "agent-studio")], new Set()).latest?.conversationId).toBe("s1");
    expect(planImprove([], new Set())).toEqual({ latest: null, borrow: [] });
  });

  it("offers only agents the person can edit", () => {
    expect(canEditAgent({ isOwner: true, accessLevel: null })).toBe(true);
    expect(canEditAgent({ isOwner: false, accessLevel: "editor" })).toBe(true);
    expect(canEditAgent({ isOwner: false, accessLevel: "viewer" })).toBe(false);
    expect(canEditAgent({ isOwner: null, accessLevel: "system" })).toBe(false);
  });
});
