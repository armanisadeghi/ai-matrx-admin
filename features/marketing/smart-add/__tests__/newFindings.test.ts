import { findingGroupOf, summarizeFindings } from "../enrich/newFindings";

const row = (guessed_kind: string, text: string, category = "fact") => ({ category, guessed_kind, url: null, value: { text } });

describe("summarizeFindings", () => {
  it("counts each finding type with a short list and a home", () => {
    const rows = [
      row("competitor", "Rival A"), row("competitor", "Rival B"), row("competitor", "Rival C"), row("competitor", "Rival D"),
      row("founder", "Dana Reyes"), row("headquarters_location", "Austin, TX"), row("yelp_page", "yelp.com/biz/x"),
      row("specialty", "soy candles"), row("product", "Lavender", "offering"), row("certification", "B Corp"),
      row("phone", "555"),
    ];
    const out = summarizeFindings(rows, "b1");
    expect(out.map((o) => [o.group, o.count])).toEqual([
      ["competitor", 4], ["person", 1], ["location", 1], ["listing", 1], ["keyword", 1], ["offering", 1], ["credential", 1],
    ]);
    expect(out[0].names).toHaveLength(3);
    expect(out[0].href).toContain("/competitors");
  });
  it("leaves out what the server resolved as already held, and repeats", () => {
    const held = (held_before: boolean) => ({
      ...row("competitor", "rival a"),
      context: { resolution: { kind: "duplicate", reason: "Already on the brand", held_before } },
    });
    const out = summarizeFindings([held(true), held(false), row("competitor", "Rival B"), row("competitor", "Rival B")], "b1");
    expect(out[0].count).toBe(2);
    expect(out[0].names).toEqual(["rival a", "Rival B"]);
  });
  it("ignores other facts", () => {
    expect(findingGroupOf({ category: "fact", guessed_kind: "phone" })).toBeNull();
  });
});
