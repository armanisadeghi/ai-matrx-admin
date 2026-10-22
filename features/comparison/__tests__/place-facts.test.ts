import { parseResult, type ComparisonResult } from "../contract";
import { attributeGrid, contactOf, hasSideBySide, hoursToday, openNow, reviewsOf, starShares, statusOf, weekOf } from "../place-facts";

const at = (h: number, m = 0) => new Date(2026, 9, 23, h, m); // a Friday

describe("hours today and open now", () => {
  const week = weekOf({ Friday: "9 am–6 pm", Monday: "9 am–6 pm", Sunday: "Closed" })!;
  it("today's line comes first, by the day", () => {
    expect(hoursToday(week, at(10))).toEqual({ day: "Friday", text: "9 am–6 pm" });
    expect(week[0][0]).toBe("Sunday");
  });
  it.each([
    ["9 am–6 pm", at(10), true], ["9 am–6 pm", at(19), false], ["Closed", at(10), false],
    ["Open 24 hours", at(3), true], ["9 am–12 pm, 2–6 pm", at(13), false], ["9 am–12 pm, 2–6 pm", at(15), true],
    ["9–5 pm", at(10), true], ["6 pm–2 am", at(1), true],
  ])("%s at %s -> %s", (text, now, want) => expect(openNow(text, now)).toBe(want));
  it("says nothing for text it cannot read", () => expect(openNow("By appointment", at(10))).toBeNull());
});

describe("star counts", () => {
  it("shares of the counted reviews, five-star first", () => {
    const s = starShares({ "1": 18, "2": 3, "3": 1, "4": 6, "5": 161 })!;
    expect(s.total).toBe(189);
    expect(s.shares[0]).toBeCloseTo(161 / 189);
  });
  it("no counts is no bar", () => expect(starShares({ "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 })).toBeNull());
});

describe("facts parse defensively", () => {
  it("contact, status, reviews", () => {
    expect(contactOf({ phone: "+1 555", booking: "https://b.example" })).toEqual({ phone: "+1 555", website: undefined, booking: "https://b.example" });
    expect(statusOf({ closed: "temporarily", claimed: true })).toEqual({ closed: "temporarily", claimed: true });
    expect(reviewsOf({ top: [{ rating: 5, text: "Great", date: null, by: "Jo" }], snippets: ["Nice"] })?.top).toHaveLength(1);
    expect(reviewsOf({ top: [], snippets: [] })).toBeNull();
  });
});

const F = (key: string, type: string) => ({ key, label: key, type, direction: "none", is_primary: false, help: "" });
const V = (value: unknown, display = "x") => ({ value, display, is_best: false, basis: "" });
const result = parseResult({
  kind: "local_business", kind_label: "Medspa", primary_field: "rating",
  fields: [{ ...F("rating", "rating"), is_primary: true, direction: "higher_better" }, F("attributes", "tags"), F("contact", "contact")],
  items: [
    { item_id: "a", name: "A", rank: 1, values: { rating: V(4.9, "4.9"), attributes: V(["Wheelchair entrance", "Parking"]), contact: V({ phone: "1" }) } },
    { item_id: "b", name: "B", rank: 2, values: { rating: V(4.5, "4.5"), attributes: V(["Parking"]), contact: V(null, "—") } },
  ],
}) as ComparisonResult;

describe("rich rows", () => {
  it("the attribute grid is yes/no per contender", () => {
    expect(attributeGrid(result.items, "attributes")).toEqual([
      { name: "Wheelchair entrance", has: [true, false] }, { name: "Parking", has: [true, true] }]);
  });
  it("a row shows only when at least two contenders have the value", () => {
    expect(hasSideBySide(result.fields[1], result)).toBe(true);
    expect(hasSideBySide(result.fields[2], result)).toBe(false);
  });
});
