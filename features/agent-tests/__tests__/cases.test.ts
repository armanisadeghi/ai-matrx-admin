jest.mock("@/utils/supabase/client", () => ({ createClient: jest.fn() }));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: jest.fn() }));

import {
  APPROVED_ANSWER_FACT_CHARS,
  APPROVED_ANSWER_FACT_ID,
  approvedAnswerFact,
  factsFromLines,
  testCaseInsert,
} from "../cases";

const base = {
  agentId: "a1",
  label: "Maria cleaning reminder",
  variables: { patient_first_name: "Maria", visit_type: "", appointment_datetime: "Tuesday 2:30 PM" },
  userInput: "Write the reminder.",
  head: { agentId: "a1", version: 3, inputContractHash: "in", outputContractHash: "out", variableDeclarations: [] },
};

describe("a test case is an eval case the runner can decide", () => {
  it("is written as kind='test_case' (never a sample) with the approved answer as a judge fact", () => {
    const row = testCaseInsert({ ...base, approvedAnswer: "Hi Maria! Reminder: cleaning Tuesday 2:30 PM." }, "org-1");
    expect(row.kind).toBe("test_case");
    expect(row.organization_id).toBe("org-1");
    expect(row.reference_output).toBe("Hi Maria! Reminder: cleaning Tuesday 2:30 PM.");
    const facts = row.judge_facts as unknown as { id: string; statement: string }[];
    expect(facts).toHaveLength(1);
    expect(facts[0].id).toBe(APPROVED_ANSWER_FACT_ID);
    expect(facts[0].statement).toContain("Hi Maria! Reminder: cleaning Tuesday 2:30 PM.");
    // Empty inputs are dropped; typed text is kept verbatim.
    expect(row.variables).toEqual({ patient_first_name: "Maria", appointment_datetime: "Tuesday 2:30 PM" });
    expect(row.user_input).toBe("Write the reminder.");
    expect(row.agent_version).toBe(3);
  });

  it("refuses a case nothing can decide (no answer, no facts: always inconclusive)", () => {
    expect(() => testCaseInsert({ ...base }, "org-1")).toThrow(/good reply/);
    expect(() => testCaseInsert({ ...base, approvedAnswer: "   " }, "org-1")).toThrow(/good reply/);
  });

  it("takes typed facts one per line", () => {
    expect(factsFromLines("Greets Maria by name\n\n  Says the time  \n")).toEqual([
      { id: "f1", statement: "Greets Maria by name" },
      { id: "f2", statement: "Says the time" },
    ]);
    const row = testCaseInsert({ ...base, facts: factsFromLines("Under 160 characters") }, "org-1");
    expect((row.judge_facts as unknown as unknown[]).length).toBe(1);
    expect(row.reference_output).toBeNull();
  });

  it("caps a long approved answer inside its fact", () => {
    const fact = approvedAnswerFact("x".repeat(APPROVED_ANSWER_FACT_CHARS + 50));
    expect(fact?.statement).toContain(`${"x".repeat(APPROVED_ANSWER_FACT_CHARS)}…`);
    expect(fact?.statement).not.toContain("x".repeat(APPROVED_ANSWER_FACT_CHARS + 1));
  });
});
