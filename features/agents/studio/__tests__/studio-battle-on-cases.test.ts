/**
 * Battle on cases (Studio phase 2b): a candidate is the Debrief proposal applied to the agent's own
 * instructions; the battle's setups name exactly what each column runs; the score and the cost
 * estimate come from eval results only.
 */
import type { DebriefProposal } from "@ai-matrx/chat/agents/debrief/debrief-proposals";
import type { TestResultView } from "@/features/agent-tests/types";
import {
  battleScore,
  candidateFromProposal,
  candidateSetup,
  estimateBattleCents,
  liveSetup,
  modelSetup,
  versionSetup,
} from "../battle";

const proposal = (over: Partial<DebriefProposal>): DebriefProposal => ({
  id: "p1",
  target: "instructions",
  title: "Cap length",
  cause: "Be thorough asks for length",
  fix: "Ask for 120 words",
  find: "Be thorough.",
  replace: "Answer in at most 120 words.",
  model: null,
  ...over,
});

const result = (over: Partial<TestResultView>): TestResultView =>
  ({ id: "r", caseId: "c1", setupKey: "live", door: "manual", verdict: null, runCostCents: null, judgeCostCents: null, userRequestIds: [], ...over }) as TestResultView;

describe("Studio battle on cases", () => {
  const messages = [{ role: "system", content: "Be thorough. Be kind." }];

  it("a proposal becomes a candidate with the new wording — or says why it cannot", () => {
    const made = candidateFromProposal(messages, proposal({}));
    expect("candidate" in made && made.candidate.messages?.[0]).toEqual({ role: "system", content: "Answer in at most 120 words. Be kind." });
    expect(candidateFromProposal(messages, proposal({ find: "Not there" }))).toEqual({ error: "The text it quotes is not in the instructions" });
    const model = candidateFromProposal(messages, proposal({ target: "model", model: "claude-sonnet-5-5" }));
    expect("candidate" in model && model.candidate).toMatchObject({ messages: null, modelId: "claude-sonnet-5-5" });
  });

  it("names what each column runs", () => {
    const c = { proposalId: "p1", title: "t", messages: [{ role: "system", content: "x" }], modelId: null };
    expect(liveSetup("a")).toEqual({ key: "live", label: "Live", holder: { kind: "agent", id: "a" } });
    expect(candidateSetup("a", c).patch).toEqual({ messages: c.messages });
    expect(modelSetup("a", "m2", "Other model").patch).toEqual({ model_id: "m2" });
    expect(versionSetup("ver-3", 3).holder).toEqual({ kind: "agent_version", id: "ver-3" });
  });

  it("estimates from measured results only, and says nothing when none are measured", () => {
    expect(estimateBattleCents([result({ runCostCents: 0 })], 3, 2)).toBeNull();
    expect(estimateBattleCents([result({ runCostCents: 0.4, judgeCostCents: 0.1 }), result({ runCostCents: 1.5 })], 3, 2)).toBeCloseTo(6);
  });

  it("names a winner only when every result is in and one setup leads", () => {
    const keys = ["live", "candidate"];
    const done = [
      result({ id: "1", setupKey: "live", verdict: "fail" }),
      result({ id: "2", setupKey: "candidate", verdict: "pass_judged" }),
    ];
    expect(battleScore(done, keys).winner).toBe("candidate");
    expect(battleScore([...done, result({ id: "3", setupKey: "live" })], keys)).toMatchObject({ winner: null, settled: false });
    expect(battleScore([result({ setupKey: "live", verdict: "pass" }), result({ setupKey: "candidate", verdict: "pass" })], keys).winner).toBeNull();
  });
});
