import { formatKnobRange, formatKnobValue } from "../ladder";

describe("knob value words", () => {
  it("a count of one uses the singular unit", () => {
    expect(formatKnobValue(1, "posts")).toBe("1 post");
    expect(formatKnobValue(2, "posts")).toBe("2 posts");
    expect(formatKnobValue(1, "pages")).toBe("1 page");
  });
  it("leaves units that are not plain plurals alone", () => {
    expect(formatKnobValue(1, "ms")).toBe("1 ms");
    expect(formatKnobValue(1, "requests/minute")).toBe("1 requests/minute");
    expect(formatKnobValue(80, "%")).toBe("80%");
  });
  it("a range names the unit once", () => {
    expect(formatKnobRange(0, 5000, "posts")).toBe("0 – 5000 posts");
    expect(formatKnobRange(1, 5000, "posts")).toBe("1 – 5000 posts");
    expect(formatKnobRange(0, 80, "%")).toBe("0% – 80%");
    expect(formatKnobRange(0, 10, null)).toBe("0 – 10");
  });
});
