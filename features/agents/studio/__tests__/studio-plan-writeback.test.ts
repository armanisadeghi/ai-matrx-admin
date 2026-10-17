import { writeAgentToPlanStep } from "../components/PlanBackLink";
import { loadPlan, savePlanChanges } from "@/features/agents/orchestra-studio/plan-store";

jest.mock("@/features/agents/orchestra-studio/plan-store", () => ({ loadPlan: jest.fn(), savePlanChanges: jest.fn() }));

const step = (n: number, id: string | null, name: string | null = null) => ({
  n, title: `S${n}`, markdown: "", summary: "", job: "", doer: "agent", modelClass: null, usesAgentId: id, usesAgentName: name,
});
const plan = (steps: unknown[]) => ({ title: "P", description: "", recommendation: null, steps, answer: "", conversationId: null });

describe("a kept Studio agent is written back onto its plan step", () => {
  beforeEach(() => jest.clearAllMocks());

  it("sets the agent and its name on the named step only", async () => {
    (loadPlan as jest.Mock).mockResolvedValue(plan([step(1, null), step(2, null)]));
    await writeAgentToPlanStep("p1", 2, "agent-b", "Writer");
    const saved = (savePlanChanges as jest.Mock).mock.calls[0][1];
    expect(saved.steps[1]).toMatchObject({ usesAgentId: "agent-b", usesAgentName: "Writer" });
    expect(saved.steps[0].usesAgentId).toBeNull();
  });

  it("does nothing when the same agent and name are already there", async () => {
    (loadPlan as jest.Mock).mockResolvedValue(plan([step(1, "a", "Writer")]));
    await writeAgentToPlanStep("p1", 1, "a", "Writer");
    expect(savePlanChanges).not.toHaveBeenCalled();
  });

  it("fills in the name when the agent was written before its name was known", async () => {
    (loadPlan as jest.Mock).mockResolvedValue(plan([step(1, "a", null)]));
    await writeAgentToPlanStep("p1", 1, "a", "Writer");
    expect((savePlanChanges as jest.Mock).mock.calls[0][1].steps[0].usesAgentName).toBe("Writer");
  });

  it("says so when the plan or the step is missing", async () => {
    (loadPlan as jest.Mock).mockResolvedValue(null);
    await expect(writeAgentToPlanStep("p1", 1, "a", null)).rejects.toThrow(/could not be opened/);
    (loadPlan as jest.Mock).mockResolvedValue(plan([step(1, null)]));
    await expect(writeAgentToPlanStep("p1", 9, "a", null)).rejects.toThrow(/no step 9/);
  });
});
