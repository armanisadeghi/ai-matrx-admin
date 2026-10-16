/**
 * Copy / export of an agent_result when the server sent the answer once.
 *
 * aidream (value_store `ANSWER_REPEAT_KEYS`, 2026-10-16): with debug off, an agent run whose `content`
 * list is non-empty arrives with `final_text: ""` and no `structured_output` / `final_message` —
 * `content` IS the answer. Before the fallback, Copy returned an empty string for every such run.
 */

import { agentResultMarkdown } from "@/features/content-ir/kinds/agent-result";

const content = [{ __kind: "brand_basics", brand_name: "Creativity Warehouse", facts: [{ field: "name" }] }];

describe("agentResultMarkdown", () => {
  it("exports the content channel when the answer fields were sent once, in content", () => {
    const out = agentResultMarkdown({ __kind: "agent_result", content, final_text: "", usage: {}, messages: [] });
    expect(out).toContain("Creativity Warehouse");
    expect(out.startsWith("```json")).toBe(true);
  });

  it("still prefers final_text, then structured_output, when they are present", () => {
    expect(agentResultMarkdown({ content, final_text: "Plain answer" })).toBe("Plain answer");
    expect(agentResultMarkdown({ content, final_text: "", structured_output: { a: 1 } })).toContain('"a": 1');
  });

  it("is empty for an envelope with nothing produced", () => {
    expect(agentResultMarkdown({ content: [], final_text: "" })).toBe("");
  });
});
