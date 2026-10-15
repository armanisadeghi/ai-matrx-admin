import { parseEntityKind, resolveEntityKind } from "../entityKind";

describe("entity kind label default", () => {
  it("reads the step's answer from structured output, content or a payload", () => {
    expect(parseEntityKind({ structured_output: { entity_kind: "person_with_business", probability: 0.8 } })).toBe("both");
    expect(parseEntityKind({ content: [{ __kind: "x" }, { entity_kind: "person" }] })).toBe("person");
    expect(parseEntityKind({ entity_kind: "business" })).toBe("business");
  });
  it("reads the answer an agent result carries as fenced JSON text (MKT-124)", () => {
    const fenced = '```json\n{"entity_kind": "person", "probability": 0.8, "reason": "Individual profile", "evidence": []}\n```';
    expect(parseEntityKind({ __kind: "agent_result", content: [{ text: fenced, __kind: "markdown" }] })).toBe("person");
    expect(parseEntityKind({ content: [{ text: '{"entity_kind": "person_with_business"}' }] })).toBe("both");
    expect(parseEntityKind({ content: [{ text: "not json {" }] })).toBeNull();
  });
  it("treats unanswerable and unknown answers as no answer", () => {
    expect(parseEntityKind({ structured_output: { entity_kind: "unanswerable" } })).toBeNull();
    expect(parseEntityKind(null)).toBeNull();
    expect(parseEntityKind({})).toBeNull();
  });
  it("shows the tab's kind until an answer lands, then the answer", () => {
    expect(resolveEntityKind("business", null, false)).toBe("business");
    expect(resolveEntityKind("business", "both", false)).toBe("both");
  });
  it("lets the person's own change win over the answer", () => {
    expect(resolveEntityKind("person", "both", true)).toBe("person");
  });
});
