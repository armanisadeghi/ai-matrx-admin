/**
 * Lane L4b: the Data Library's plain-language box and the homes filters.
 * - the form shows exactly the filters the server lists for the source (never one that does nothing);
 * - "3-bed homes under $600k in Fresno CA" fills the homes form (provider filters on) and is complete;
 * - with the faster provider off, the ask fills what Bright Data takes and SAYS what it cannot apply;
 * - the faster provider's source is the one an ask opens; an unsettled ask offers 2-3 tasks and a way out.
 */
import React from "react";
import { createRoot } from "react-dom/client";
import { act } from "react-dom/test-utils";

import { parseAskReading } from "../ask";
import { fillFromAsk, pickAskSource } from "../askFill";
import { buildInput, parseCatalog, type DataSource } from "../contract";
import { SearchFilters } from "../SearchFilters";
import { bedsValue, homeTypeChoices, withBeds, withChoice } from "../filterChoices";
import { isSettled, likelyTasks, planFor } from "../library/AskBox";
import { parseLibrary } from "../library/catalog";

jest.mock("@/components/official/ProInput", () => ({
  ProInput: (p: { "aria-label"?: string; value?: string }) => <input aria-label={p["aria-label"]} defaultValue={p.value} />,
}));
jest.mock("@ai-matrx/design-system/controls", () => {
  const box = (p: { "aria-label"?: string }) => <div aria-label={p["aria-label"]} />;
  return { SegmentedControl: box, Select: box, Button: () => null, OptionCombobox: box };
});
jest.mock("@/features/comparison/server", () => ({ lookupItems: jest.fn() }));

const FILTERS = ["status", "home_type", "price_min", "price_max", "beds_min", "baths_min"];

const wire = (searchFilters: string[]) => ({
  key: "zillow_listing", label: "Zillow homes", group: "Real estate", verified_live: true, verified: true,
  usd_per_record: 0.0015, points_per_record: 30,
  input: {
    kind: "url",
    // The live row (2026-10-22 fix): the search needs only Where; status and home type are optional choices.
    fields: [
      { name: "url", label: "Page address", required: true, type: "url" },
      { name: "listingCategory", label: "For sale, for rent or sold", required: false },
      { name: "HomeType", label: "Home type", required: false },
    ],
    discover_options: { input_filters: ["location"] },
  },
  search_filters: searchFilters,
});

const fresno = parseAskReading({
  text: "3-bed homes under $600k in Fresno CA", task: "homes", card_id: "homes-for-sale", confidence: "clear",
  place: "Fresno CA", filters: { beds_min: 3, beds_exact: true, price_max: 600000 }, alternatives: [],
  chips: [{ key: "place", label: "Fresno CA" }, { key: "beds_min", label: "3 beds" }, { key: "price_max", label: "Under $600k" }],
});

const on = parseCatalog({ sources: [wire(FILTERS)] }).sources[0];
const off = parseCatalog({ sources: [wire([])] }).sources[0];

function mount(el: React.ReactElement) {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(el));
  return { host, done: () => { act(() => root.unmount()); host.remove(); } };
}

describe("the form shows only the filters the server lists", () => {
  it("reads the list off the wire", () => {
    expect(on.search_filters).toEqual(FILTERS);
    expect(off.search_filters).toEqual([]);
  });
  it("draws every listed filter and nothing for an empty list", () => {
    const a = mount(<SearchFilters source={on} values={{}} onValues={() => {}} />);
    for (const label of ["For sale or rent", "Lowest price", "Highest price", "Beds", "Baths", "Home type"]) {
      expect(a.host.querySelector(`[aria-label="${label}"]`)).not.toBeNull();
    }
    a.done();
    const b = mount(<SearchFilters source={off} values={{}} onValues={() => {}} />);
    expect(b.host.innerHTML).toBe("");
    b.done();
  });
  it("draws only the listed subset", () => {
    const c = mount(<SearchFilters source={{ search_filters: ["beds_min"] }} values={{}} onValues={() => {}} />);
    expect(c.host.querySelector('[aria-label="Beds"]')).not.toBeNull();
    expect(c.host.querySelector('[aria-label="Lowest price"]')).toBeNull();
    c.done();
  });
  it("sends the filters only when listed, blanks dropped", () => {
    const values = { location: "Fresno CA", price_max: "600000", beds_min: "3", beds_exact: "true", baths_min: "" };
    expect(buildInput(on, values, "input_filters").input).toEqual({
      inputs: [{ location: "Fresno CA", price_max: "600000", beds_min: "3", beds_exact: "true" }],
    });
    expect(buildInput(off, { ...values, listingCategory: "Sold", HomeType: "Condos" }, "input_filters").input).toEqual({
      inputs: [{ location: "Fresno CA", listingCategory: "Sold", HomeType: "Condos" }],
    });
  });
  it("beds, status and home type edit the values the way the server reads them", () => {
    expect(bedsValue({})).toBe("any");
    expect(withBeds({ price_max: "1" }, "3")).toEqual({ price_max: "1", beds_min: "3" });
    expect(withBeds({ beds_min: "3", beds_exact: "true" }, "any")).toEqual({});
    expect(bedsValue({ beds_min: "3", beds_exact: "true" })).toBe("=3");
    expect(withChoice({ home_type: "land" }, "status", "for_rent")).toEqual({ status: "for_rent" });
    expect(homeTypeChoices("for_rent").map((c) => c.value)).not.toContain("land");
    expect(homeTypeChoices("sold").map((c) => c.value)).toContain("land");
  });
});

describe("the ask fills the form", () => {
  it("homes under 600k, 3 beds, Fresno: complete, every filter in the form", () => {
    const fill = fillFromAsk(on, fresno);
    expect(fill.values).toEqual({ location: "Fresno CA", price_max: "600000", beds_min: "3", beds_exact: "true" });
    expect(fill.complete).toBe(true);
    expect(fill.unapplied).toEqual([]);
  });
  it("with the faster provider off it fills what the source takes and says what it cannot apply", () => {
    const sold = parseAskReading({ ...fresno, filters: { ...fresno.filters, price_max: 600000, beds_min: 3, status: "for_rent", home_type: "condo" }, chips: [...fresno.chips.map((c) => ({ key: c.key, label: c.label })), { key: "status", label: "For rent" }, { key: "home_type", label: "Condo" }] });
    const fill = fillFromAsk(off, sold);
    expect(fill.values).toEqual({ location: "Fresno CA", listingCategory: "House for rent", HomeType: "Condos" });
    expect(fill.complete).toBe(true);
    expect(fill.unapplied).toEqual(["3 beds", "Under $600k"]);
  });
  it("an ask with no place is not complete (the form opens, nothing runs)", () => {
    const nowhere = parseAskReading({ ...fresno, place: "", near_me: true });
    expect(fillFromAsk(on, nowhere).complete).toBe(false);
  });
  it("a keyword source takes the subject and the place", () => {
    const biz = parseCatalog({ sources: [{ key: "g", label: "G", group: "x", input: { kind: "keyword", fields: [{ name: "keyword", label: "k", required: true }, { name: "location", label: "l", required: true }] } }] }).sources[0];
    const r = parseAskReading({ task: "local_business", confidence: "clear", subject: "plumbers", place: "Austin", filters: {}, chips: [{ key: "place", label: "Austin" }] });
    const fill = fillFromAsk(biz, r);
    expect(fill.values).toEqual({ keyword: "plumbers", location: "Austin" });
    expect(fill.complete).toBe(true);
  });
  it("prefers the source whose faster provider is on", () => {
    const slow = { ...off, key: "realtor_international", confirmed: true, knownIssue: null };
    const fast = { ...on, confirmed: false, knownIssue: null };
    expect(pickAskSource([slow, fast])?.key).toBe("zillow_listing");
    expect(pickAskSource([slow, { ...off, confirmed: true, knownIssue: null }])?.key).toBe("realtor_international");
    expect(pickAskSource([])).toBeNull();
  });
});

describe("an unsettled ask offers choices and a way out", () => {
  const apple = parseAskReading({ task: "company_research", card_id: "research-company", confidence: "guessed", alternatives: ["products", "company_reviews", "jobs", "homes"] });
  it("settles only when clear or without rivals", () => {
    expect(isSettled(fresno)).toBe(true);
    expect(isSettled(apple)).toBe(false);
    expect(isSettled(parseAskReading({ task: "unknown", confidence: "unclear" }))).toBe(false);
  });
  it("offers at most three likely tasks, the guess first", () => {
    const tasks = likelyTasks(apple);
    expect(tasks.map((t) => t.id)).toEqual(["research-company", "product-price", "company-reviews"]);
    expect(likelyTasks(parseAskReading({ task: "unknown", confidence: "unclear" })).length).toBe(3);
  });
  it("plans the filled source for a chosen task", () => {
    const library = parseLibrary({ sources: [wire(FILTERS)] });
    const plan = planFor(library, "homes-for-sale", fresno);
    expect(plan?.source.key).toBe("zillow_listing");
    expect(plan?.run).toBe(true);
    expect(planFor(library, "company-reviews", fresno)).toBeNull();
  });
});

describe("a source billed per search quotes ceil(records / per search) x price", () => {
  it("equals the bill", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { sourceCostRow } = require("../library/hooks") as typeof import("../library/hooks");
    const per = { pointsPerRecord: 2, usd_per_record: 0.0004, recordsPerSearch: 41, pointsPerSearch: 80 };
    expect(sourceCostRow(per, 10, "Total").points).toBe(80);
    expect(sourceCostRow(per, 42, "Total").points).toBe(160);
    expect(sourceCostRow({ pointsPerRecord: 30, usd_per_record: 0.0015 }, 10, "Total").points).toBe(300);
  });
});
