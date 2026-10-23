import { redactPatternOptions } from "../redactPatternOptions";

describe("redactPatternOptions", () => {
  it("shows the catalog's words, never the raw id", () => {
    const out = redactPatternOptions({ patterns: [{ id: "ssn_us", pattern: "x", description: "US Social Security Number" }, { id: "credit_card", pattern: "y", description: "" }, { id: "iban" }] });
    expect(out).toEqual([
      { id: "ssn_us", label: "US Social Security Number" },
      { id: "credit_card", label: "Credit card" },
      { id: "iban", label: "Iban" },
    ]);
    expect(out.some((o) => o.label === o.id)).toBe(false);
  });
});
