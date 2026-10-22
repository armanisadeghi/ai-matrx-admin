/** @jest-environment node */
import type { DrillDefinition } from "@ai-matrx/records";
import { recordsOf } from "../types";
import { useRecordsNoun } from "../DrillRecords";

// night walk 2026-10-22: the records header cut its noun ("1,186 tool call the res") because the
// declared records.noun was dropped and the grain sentence was parsed instead.
describe("a records declaration's own noun", () => {
  const def = {
    key: "tool_refetch",
    grain: "one row per tool call the re-fetch report counts (local, agent and external tools, not archived)",
    dimensions: [],
    measures: [],
    records: { fact: "tool_call_facts", noun: "tool call", columns: ["created_at"] },
  } as unknown as DrillDefinition;

  it("recordsOf keeps the declared noun", () => {
    expect(recordsOf(def)?.noun).toBe("tool call");
  });

  it("useRecordsNoun prefers it over the grain sentence", () => {
    expect(useRecordsNoun(def, recordsOf(def)!)).toBe("tool call");
  });
});
