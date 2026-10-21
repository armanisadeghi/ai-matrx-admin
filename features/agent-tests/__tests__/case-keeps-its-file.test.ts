jest.mock("@/utils/supabase/client", () => ({ createClient: jest.fn() }));
jest.mock("@/lib/organizations/ensureOrgId", () => ({ ensureOrgId: jest.fn() }));

import { testCaseInsert } from "../cases";
import { failReason } from "../case-grid";
import type { TestResultView } from "../types";

const head = { agentId: "a1", version: 3, inputContractHash: "in", outputContractHash: "out", variableDeclarations: [] };
const FILE = { type: "media", kind: "document", url: "https://files.example/inspection.pdf", file_id: "f-inspection", mime_type: "application/pdf" };

describe("a case saved from a run with an attached file keeps the file", () => {
  it("stores the media part beside the typed text, not just the text", () => {
    const row = testCaseInsert(
      {
        agentId: "a1",
        label: "Inspection run",
        variables: {},
        userInput: "Summarize the attached report.",
        inputContent: [{ type: "text", text: "Summarize the attached report." }, FILE],
        approvedAnswer: "The report finds two issues.",
        head,
      },
      "org-1",
    );
    const stored = (row.metadata as { input_content: unknown[] }).input_content;
    expect(stored).toHaveLength(2);
    expect(stored[1]).toEqual(FILE);
  });

  it("keeps a file when nothing was typed", () => {
    const row = testCaseInsert(
      { agentId: "a1", label: "File only", variables: {}, userInput: "", inputContent: [FILE], approvedAnswer: "ok", head },
      "org-1",
    );
    expect((row.metadata as { input_content: unknown[] }).input_content).toEqual([FILE]);
  });

  it("a hand-written case still stores its typed text", () => {
    const row = testCaseInsert({ agentId: "a1", label: "Typed", variables: {}, userInput: "Hello", approvedAnswer: "ok", head }, "org-1");
    expect((row.metadata as { input_content: unknown[] }).input_content).toEqual([{ type: "text", text: "Hello" }]);
  });
});

describe("the case row says why a case did not pass", () => {
  const base = { verdict: "fail", verdictReason: null, checks: [], error: null } as unknown as TestResultView;
  it("uses the judge's reason first", () => {
    expect(failReason({ ...base, verdictReason: " Missing the date " })).toBe("Missing the date");
  });
  it("falls back to the deciding check", () => {
    const checks = [{ required: true, outcome: "fail", reason: "No greeting", title: "Greets" }] as unknown as TestResultView["checks"];
    expect(failReason({ ...base, checks })).toBe("No greeting");
  });
  it("says nothing for a pass or a case not run", () => {
    expect(failReason({ ...base, verdict: "pass_judged" } as TestResultView)).toBeNull();
    expect(failReason(undefined)).toBeNull();
  });
});
