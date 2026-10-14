import { ANSWER_KINDS, emptyAnswers, isEmptyAnswers, prune, unpack, type RunAnswers } from "../runMemory";
import { customItem } from "../evidence";

describe("Smart Add run memory", () => {
  it("round-trips what the screen saved and treats junk as nothing", () => {
    const a = { ...emptyAnswers(), decisions: { "name:Ritual": "preferred" as const, "social:x:ritual": "no" as const }, namesakes: ["k"] };
    const back = unpack(JSON.parse(JSON.stringify({ ...a, at: "2026-10-14T00:00:00Z" })));
    expect(back?.decisions).toEqual(a.decisions);
    expect(back?.namesakes).toEqual(["k"]);
    expect(isEmptyAnswers(back!)).toBe(false);
    expect(unpack(null)).toBeNull();
    expect(isEmptyAnswers(unpack({ decisions: "x", namesakes: 3 })!)).toBe(true);
  });

  it("keeps only the 30 newest sessions", () => {
    const runs: Record<string, Record<string, unknown>> = {};
    for (let i = 0; i < 35; i++) runs[`r${i}`] = { at: `2026-10-14T00:00:${String(i).padStart(2, "0")}Z` };
    const kept = Object.keys(prune(runs));
    expect(kept).toHaveLength(30);
    expect(kept).not.toContain("r0");
    expect(kept).toContain("r34");
  });

  it("saves and restores EVERY kind of answer; a kind added to the screen cannot be missed", () => {
    const sample: RunAnswers = {
      decisions: { "name:x": "preferred" },
      webChoices: { "web:a": { kind: "mention", sentiment: null } },
      relations: { "social:facebook:x": { candidate: {} as never, relation: { key: "parent", label: "Parent company", routesTo: null } as never } },
      namesakes: ["k"],
      typed: [customItem("name", "Typed")],
      skipped: ["social:facebook:ritual"],
      taglines: { "name:we serve you": customItem("tagline", "We serve you") },
      webMarks: { "web:b": "later" },
      separated: ["logo:instagram:ritual"],
    };
    // Every declared kind is in the sample, and the empty state names exactly the declared kinds.
    expect(Object.keys(sample).sort()).toEqual(Object.keys(ANSWER_KINDS).sort());
    expect(Object.keys(emptyAnswers()).sort()).toEqual(Object.keys(ANSWER_KINDS).sort());
    const back = unpack(JSON.parse(JSON.stringify({ ...sample, at: "x" })))!;
    for (const kind of Object.keys(ANSWER_KINDS) as (keyof RunAnswers)[]) {
      expect({ kind, value: back[kind] }).toEqual({ kind, value: sample[kind] });
      // Each kind alone counts as an answer worth saving.
      expect(isEmptyAnswers({ ...emptyAnswers(), [kind]: sample[kind] })).toBe(false);
    }
  });
});
