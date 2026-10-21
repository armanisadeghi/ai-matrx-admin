import { parseResult, type ComparisonResult } from "../contract";
import { barFraction, headlineOf, nameFromLink, verdictOf, whyLine } from "../verdict";

const F = (key: string, type: string, direction = "higher_better", is_primary = false) =>
  ({ key, label: key, type, direction, is_primary, help: "" });
const V = (value: unknown, display: string, is_best = false) => ({ value, display, is_best, basis: "on the page" });

const result = parseResult({
  kind: "companies_reviews", kind_label: "Companies", primary_field: "rating",
  fields: [F("rating", "rating", "higher_better", true), F("reviews", "int"), F("pos", "percent"), F("verified", "percent", "none"), F("cat", "text", "none")],
  items: [
    { item_id: "b", name: "Beta", rank: 1, values: { rating: V(4.6, "4.6", true), reviews: V(900, "900"), pos: V(0.9, "90%", true), verified: V(null, "—"), cat: V("Shop", "Shop") } },
    { item_id: "a", name: "Alpha", rank: 2, values: { rating: V(4.1, "4.1"), reviews: V(1200, "1,200", true), pos: V(0.7, "70%"), verified: V(0.5, "50%"), cat: V("Shop", "Shop") } },
    { item_id: "x", name: "Gone", rank: 3, error: "We could not find Gone. Check the spelling or add the city.", values: {} },
  ],
}) as ComparisonResult;

describe("the verdict reads the result in plain words", () => {
  it("leader leads on N of M rankable fields with data; failed items never count", () => {
    expect(verdictOf(result)).toMatchObject({ leads: 2, total: 3, tie: false });
    expect(verdictOf(result).leader?.name).toBe("Beta");
  });

  it("each field says who leads and by how much", () => {
    expect(whyLine(result.fields[0], result)).toBe("Beta leads · 0.5 ahead of Alpha");
    expect(whyLine(result.fields[1], result)).toBe("Alpha leads · 300 ahead of Beta");
    expect(whyLine(result.fields[2], result)).toBe("Beta leads · 90% to 70% for Alpha");
    expect(whyLine(result.fields[3], result)).toBe("Shown, not ranked");
  });

  it("bars sit on each field's own scale and no data has no bar", () => {
    expect(barFraction(result.fields[0], 4.6, result)).toBeCloseTo(0.92);
    expect(barFraction(result.fields[1], 900, result)).toBeCloseTo(0.75);
    expect(barFraction(result.fields[2], 0.9, result)).toBeCloseTo(0.9);
    expect(barFraction(result.fields[3], null, result)).toBeNull();
  });

  it("a link reads as a name, never as a raw address", () => {
    expect(nameFromLink("https://www.trustpilot.com/review/www.hydroflask.com")).toBe("hydroflask.com");
    expect(nameFromLink("https://www.google.com/maps/place/Sparrow+Bakery/@44,-121")).toBe("Sparrow Bakery");
  });
});

describe("the headline stays honest when another item leads as many fields", () => {
  it("one clear leader keeps the short line", () => {
    expect(headlineOf(result)).toEqual({ lead: "Beta", rest: "leads on 2 of 3" });
  });
  it("a tie on field count names both and what ranks first", () => {
    const tied = parseResult({
      kind: "companies_reviews", kind_label: "Companies", primary_field: "rating",
      fields: [F("rating", "rating", "higher_better", true), F("reviews", "int"), F("pos", "percent"), F("recent", "rating")],
      items: [
        { item_id: "b", name: "Beta", rank: 1, values: { rating: V(4.6, "4.6", true), reviews: V(900, "900"), pos: V(0.9, "90%", true), recent: V(4, "4.0") } },
        { item_id: "a", name: "Alpha", rank: 2, values: { rating: V(4.1, "4.1"), reviews: V(1200, "1,200", true), pos: V(0.7, "70%"), recent: V(4.2, "4.2", true) } },
      ],
    }) as ComparisonResult;
    expect(headlineOf(tied)).toEqual({ lead: "Beta and Alpha", rest: "each lead 2 of 4 — Beta ranks first on rating" });
  });
});

describe("a thin sample that tops the raw number says what the ranking weighs", () => {
  it("names the review weighting when the first-ranked item is not best on the raw rating", () => {
    const r = parseResult({
      kind: "local_business", kind_label: "Local businesses", primary_field: "rating",
      fields: [F("rating", "rating", "higher_better", true), F("reviews", "int")],
      items: [
        { item_id: "deep", name: "Deep", rank: 1, values: { rating: V(4.8, "4.8"), reviews: V(341, "341", true) } },
        { item_id: "thin", name: "Thin", rank: 2, thin_sample: "Only 6 reviews", values: { rating: V(5, "5.0", true), reviews: V(6, "6") } },
      ],
    }) as ComparisonResult;
    expect(r.items[1].thin_sample).toBe("Only 6 reviews");
    expect(headlineOf(r)?.rest).toBe("each lead 1 of 2 — Deep ranks first on rating, weighted by reviews");
  });
});

describe("a field everyone is level on is not a win (live walk 2026-10-21: 'leads 2 of 2' over 'All tied at 4.6')", () => {
  const level = parseResult({
    kind: "local_business", kind_label: "Local businesses", primary_field: "rating",
    fields: [F("rating", "rating", "higher_better", true), F("reviews", "int")],
    items: [
      { item_id: "l", name: "Leonard's Bakery", rank: 1, values: { rating: V(4.6, "4.6", true), reviews: V(13607, "13,607", true) } },
      { item_id: "i", name: "Liliha Bakery", rank: 2, values: { rating: V(4.6, "4.6", true), reviews: V(4820, "4,820") } },
    ],
  }) as ComparisonResult;
  it("counts only real wins and says what is level", () => {
    expect(verdictOf(level)).toMatchObject({ leads: 1, total: 2, tied: ["rating"] });
    expect(headlineOf(level)).toEqual({ lead: "Leonard's Bakery", rest: "leads on 1 of 2 — level on rating" });
    expect(whyLine(level.fields[0], level)).toBe("All tied at 4.6");
  });
  it("items level on every field are named together, not crowned", () => {
    const all = parseResult({
      kind: "local_business", kind_label: "Local businesses", primary_field: "rating",
      fields: [F("rating", "rating", "higher_better", true)],
      items: [
        { item_id: "a", name: "A", rank: 1, values: { rating: V(4.6, "4.6", true) } },
        { item_id: "b", name: "B", rank: 2, values: { rating: V(4.6, "4.6", true) } },
      ],
    }) as ComparisonResult;
    expect(headlineOf(all)).toEqual({ lead: "A and B", rest: "are level on rating" });
  });
});
