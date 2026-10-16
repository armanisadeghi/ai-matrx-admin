import { parseResult, type ComparisonResult } from "../contract";
import { barFraction, nameFromLink, verdictOf, whyLine } from "../verdict";

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
    expect(whyLine(result.fields[2], result)).toBe("Beta leads · 20 pts ahead of Alpha");
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
