/** "Avg 50%" on a table of plain text meant nothing (review 3 R14): the average shows only over real scores. */
import { hasMeaningfulScores } from "../comparisonSummary";
import { parseComparisonJSON } from "../parseComparisonJSON";

const parse = (criteria: Record<string, unknown>[]) =>
  parseComparisonJSON(JSON.stringify({ comparison: { title: "t", items: ["A", "B"], criteria } })).criteria;

describe("the comparison Avg tile", () => {
  it("is not earned by plain hours, prices and scores", () => {
    expect(hasMeaningfulScores(parse([{ name: "Hours", values: [8, 12] }, { name: "Price", values: [20, 30] }, { name: "Score", values: [7, 9] }]))).toBe(false);
  });
  it("is earned by a rating, a declared cost, or a yes/no", () => {
    expect(hasMeaningfulScores(parse([{ name: "Quality", type: "rating", values: [4, 5] }]))).toBe(true);
    expect(hasMeaningfulScores(parse([{ name: "Price", type: "cost", values: [8, 12] }]))).toBe(true);
    expect(hasMeaningfulScores(parse([{ name: "Free", type: "boolean", values: [true, false] }]))).toBe(true);
  });
});
