import { emptyAnswers, isEmptyAnswers, prune, unpack } from "../runMemory";

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
});
