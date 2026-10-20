/**
 * A comparison cell shows what the author wrote. A plain number is never given
 * a currency sign: "$" appears only when the criterion declares `type: "cost"`.
 */
import { parseComparisonJSON } from "../parseComparisonJSON";

const parse = (criterion: Record<string, unknown>) =>
  parseComparisonJSON(
    JSON.stringify({ comparison: { title: "t", items: ["A", "B", "C"], criteria: [criterion] } }),
  ).criteria[0];

describe("comparison values are not given invented formatting", () => {
  it("a plain number column is not inferred as a currency", () => {
    expect(parse({ name: "Seats", values: [8, 12, 30] }).type).not.toBe("cost");
    expect(parse({ name: "Seats", values: [8, 12, 30] }).values).toEqual(["8", "12", "30"]);
  });

  it("a single plain 8 stays text", () => {
    expect(parse({ name: "Seats", values: [8, 9, 10] }).type).toBe("text");
  });

  it("a declared cost criterion is still a cost", () => {
    expect(parse({ name: "Price", type: "cost", values: [8, 12, 30] }).type).toBe("cost");
  });

  it("dollar-sign values are still inferred as cost", () => {
    expect(parse({ name: "Price", values: ["$$", "$$$", "$"] }).type).toBe("cost");
  });
});
