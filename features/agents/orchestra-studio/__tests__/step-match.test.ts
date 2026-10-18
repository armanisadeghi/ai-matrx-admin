import { matchStep, confidenceLabel } from "../step-match";
import { needsAgent, stepKind } from "../step-kind";
import { planProgress } from "../plan-progress";

const generic = [
  { id: "a", name: "Project assistant", description: "Helps with project tasks" },
  { id: "b", name: "Newsletter assistant", description: "Drafts the weekly newsletter" },
  { id: "c", name: "Fundraising assistant", description: "Writes donor appeals" },
];
const factCheck = { title: "Medical Fact-Checker", summary: "Gets the original source again, the draft and the claim list.", job: "Checks every medical claim against the source." };

describe("matching a step to an existing agent needs real fit", () => {
  it("never matches a generic assistant to the medical fact-checker step (the reviewed failure)", () => {
    expect(matchStep(factCheck, generic)).toBeNull();
    expect(matchStep({ title: "Article Writer" }, generic)).toBeNull();
    expect(matchStep({ title: "Social Post Writer" }, generic)).toBeNull();
  });

  it("suggests an agent that really does the job, with its confidence", () => {
    const m = matchStep(factCheck, [...generic, { id: "d", name: "Medical claim fact checker", description: "Checks each medical claim in an article against its source" }]);
    expect(m?.agentId).toBe("d");
    expect(m?.confidence).toBe("strong");
    expect(confidenceLabel(m!)).toMatch(/^Strong match · \d+%$/);
  });

  it("calls a partial fit only a possible match", () => {
    const m = matchStep({ title: "Medical Fact-Checker", job: "Checks claims." }, [{ id: "e", name: "Medical notes helper", description: "Summarises clinic notes" }]);
    expect(m === null || m.confidence === "possible").toBe(true);
  });

  it("skips archived agents and unnamed ones", () => {
    expect(matchStep(factCheck, [{ id: "z", name: "Medical fact checker", isArchived: true }, { id: "y", name: null }])).toBeNull();
  });
});

describe("a step's kind decides what it offers", () => {
  it("code steps and person steps are not agent steps", () => {
    expect(stepKind({ doer: "code" })).toBe("code");
    expect(stepKind({ doer: "human" })).toBe("person");
    for (const d of ["agent", "ai-call", "decision", "unknown"] as const) expect(stepKind({ doer: d })).toBe("agent");
  });

  it("only agent steps count toward 'have an agent'", () => {
    const base = { n: 1, title: "t", markdown: "", summary: "", job: "", modelClass: null, usesAgentName: null };
    const steps = [
      { ...base, doer: "ai-call" as const, usesAgentId: "a" },
      { ...base, doer: "code" as const, usesAgentId: null },
      { ...base, doer: "human" as const, usesAgentId: null },
      { ...base, doer: "agent" as const, usesAgentId: null },
    ];
    expect(planProgress({ steps })).toEqual({ built: 1, total: 2 });
    expect(needsAgent(steps[1])).toBe(false);
  });
});
