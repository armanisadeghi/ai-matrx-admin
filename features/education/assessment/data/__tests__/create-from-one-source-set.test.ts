// The New quiz / practice test page sends ONE SourceSet (pointers) to the server
// resolve, and keeps its style answers across a reload. A deck or a library
// document named by the agent target is a one-Source set through the same door
// — never a client-side card / chunk read (the old deck and document paths).

import { asSourceSet } from "../generationSource";
import { restoreAssessmentStyle } from "../createStyleDraft";
import { createSourceRef, createSourceSet } from "@ai-matrx/agents/sources";

describe("what a quiz is generated from", () => {
  it("a deck is one fc_set Source", () => {
    const set = asSourceSet({ mode: "deck", deck: { id: "d1", name: "Cells" } });
    expect(set?.sources.map((r) => [r.resource_type, r.resource_id])).toEqual([["fc_set", "d1"]]);
  });
  it("a library document is one processed_document Source", () => {
    const set = asSourceSet({ mode: "document", document: { id: "p1", name: "Ch. 3" } });
    expect(set?.sources.map((r) => [r.resource_type, r.resource_id])).toEqual([["processed_document", "p1"]]);
  });
  it("picked Sources go as they were picked; a topic alone is no Source set", () => {
    const picked = createSourceSet([createSourceRef("note", "n1"), createSourceRef("file", "f1")]);
    expect(asSourceSet({ mode: "sources", sources: picked })).toBe(picked);
    expect(asSourceSet({ mode: "topic", topic: "Mitosis" })).toBeNull();
  });
});

describe("the style answers come back after a reload", () => {
  it("restores every known answer and names the unknown ones", () => {
    const { values, rejectedKeys } = restoreAssessmentStyle({
      count: 12,
      difficulty: "Hard",
      depth: "exam",
      questionTypes: ["multiple_choice", "true_false"],
      examType: "AP Biology",
      timeLimitMinutes: 30,
      userRequest: "One case study",
      mode: "deck",
    });
    expect(values).toEqual({
      count: 12,
      difficulty: "Hard",
      depth: "exam",
      questionTypes: ["multiple_choice", "true_false"],
      examType: "AP Biology",
      timeLimitMinutes: 30,
      userRequest: "One case study",
    });
    expect(rejectedKeys).toEqual(["mode"]);
  });
  it("refuses a bad value rather than guessing", () => {
    const { values, rejectedKeys } = restoreAssessmentStyle({ count: 0, difficulty: "Brutal", questionTypes: ["essay"] });
    expect(values).toEqual({});
    expect(rejectedKeys).toEqual(["count", "difficulty", "questionTypes"]);
  });
});
