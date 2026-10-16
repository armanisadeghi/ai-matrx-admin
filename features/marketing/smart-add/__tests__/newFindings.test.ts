import { findingGroupOf, summarizeFindings } from "../enrich/newFindings";

const row = (guessed_kind: string, text: string, category = "fact") => ({ category, guessed_kind, url: null, value: { text } });
const none = { competitors: [], people: [], offerings: [] };

describe("summarizeFindings", () => {
  it("counts each finding type with a short list and a home", () => {
    const rows = [
      row("competitor", "Rival A"), row("competitor", "Rival B"), row("competitor", "Rival C"), row("competitor", "Rival D"),
      row("founder", "Dana Reyes"), row("headquarters_location", "Austin, TX"), row("yelp_page", "yelp.com/biz/x"),
      row("specialty", "soy candles"), row("product", "Lavender", "offering"), row("certification", "B Corp"),
      row("phone", "555"),
    ];
    const out = summarizeFindings(rows, none, "b1");
    expect(out.map((o) => [o.group, o.count])).toEqual([
      ["competitor", 4], ["person", 1], ["location", 1], ["listing", 1], ["keyword", 1], ["offering", 1], ["credential", 1],
    ]);
    expect(out[0].names).toHaveLength(3);
    expect(out[0].href).toContain("/competitors");
  });
  it("leaves out what the brand already held and repeats", () => {
    const kept = { ...none, competitors: [{ name: "Rival A" }] };
    const out = summarizeFindings([row("competitor", "rival a"), row("competitor", "Rival B"), row("competitor", "Rival B")], kept, "b1");
    expect(out[0].count).toBe(1);
  });
  it("ignores other facts", () => {
    expect(findingGroupOf({ category: "fact", guessed_kind: "phone" })).toBeNull();
  });
});
