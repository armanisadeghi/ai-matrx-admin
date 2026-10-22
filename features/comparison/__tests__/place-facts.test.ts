import { parseResult, type ComparisonResult } from "../contract";
import { attributeGrid, contactOf, hasSideBySide, hoursToday, openStatus, reviewsOf, starShares, statusOf, weekOf } from "../place-facts";

// 2026-10-23 17:00 UTC is a Friday: 10:00 in Los Angeles, 02:00 Saturday in Tokyo
const NOW = new Date(Date.UTC(2026, 9, 23, 17, 0));
const LA = "America/Los_Angeles";

describe("hours today and open now, on the business's own clock", () => {
  const week = weekOf({ days: { Friday: "9 am–6 pm", Monday: "9 am–6 pm", Sunday: "Closed", Saturday: "10 am–2 pm" }, timezone: LA })!;
  it("today's line is the business's day, not the viewer's", () => {
    expect(hoursToday(week, NOW)).toEqual({ day: "Friday", text: "9 am–6 pm" });
    expect(hoursToday({ ...week, timezone: "Asia/Tokyo" }, NOW)?.day).toBe("Saturday");
    expect(week.days[0][0]).toBe("Sunday");
  });
  it("no zone means no today and no status, never a guess", () => {
    const bare = weekOf({ days: { Friday: "9 am–6 pm" }, timezone: null })!;
    expect(hoursToday(bare, NOW)).toBeNull();
    expect(openStatus(bare, NOW)).toBeNull();
  });
  const t = (h: number, m = 0) => new Date(Date.UTC(2026, 9, 23, h + 7, m)); // Friday, LA wall clock (PDT, UTC-7)
  const friday = (text: string, now: Date, thursday = "Closed") =>
    openStatus(weekOf({ days: { Friday: text, Thursday: thursday }, timezone: LA })!, now);
  it.each([
    ["9 am–6 pm", t(10), true], ["9 am–6 pm", t(19), false], ["Closed", t(10), false],
    ["Open 24 hours", t(3), true], ["9 am–12 pm, 2–6 pm", t(13), false], ["9 am–12 pm, 2–6 pm", t(15), true],
    ["9–5 pm", t(10), true], ["6 pm–2 am", t(1), false], ["6 pm–2 am", t(20), true],
  ])("%s -> %s", (text, now, want) => expect(friday(text, now)).toBe(want));
  it("the early hours belong to the previous day's overnight line", () => {
    expect(friday("9 am–6 pm", t(1), "6 pm–2 am")).toBe(true);
    expect(friday("9 am–6 pm", t(3), "6 pm–2 am")).toBe(false);
  });
  it("says nothing for text it cannot read", () => expect(friday("By appointment", t(10))).toBeNull());
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
