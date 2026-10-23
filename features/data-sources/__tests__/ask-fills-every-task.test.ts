/**
 * The ask box writes EVERY part of a sentence into the source's own fields, or names it under "Not applied here".
 * Live 2026-10-22: "plumbers in Austin TX" left Austin TX unapplied on the map search (it has no place field, the
 * place belongs in its words); "software engineer at Google" filled only Google and dropped the role silently.
 */
import { parseAskReading } from "../ask";
import { fillFromAsk } from "../askFill";
import { parseCatalog } from "../contract";

jest.mock("@/features/comparison/server", () => ({ lookupItems: jest.fn() }));

const src = (key: string, kind: "url" | "keyword", fields: { name: string; required: boolean }[], discover: Record<string, string[]> = {}) =>
  parseCatalog({ sources: [{ key, label: key, group: "g", input: { kind, fields: fields.map((f) => ({ ...f, label: f.name })), discover_options: discover } }] }).sources[0];

const maps = src("google_maps_place", "url", [{ name: "url", required: true }], { cid: ["CID"], location: ["country", "keyword"], place_id: ["place_id"] });
const yelp = src("yelp_business", "url", [{ name: "url", required: true }], { bounding_box: ["location", "category"], search_filters: ["category", "location"] });
const linkedinJobs = src("linkedin_jobs_search", "keyword", [{ name: "keyword", required: false }, { name: "location", required: true }]);
const indeedJobs = src("indeed_jobs_search", "keyword", [{ name: "keyword_search", required: true }, { name: "location", required: true }]);

const read = (o: Record<string, unknown>) => parseAskReading({ confidence: "clear", alternatives: [], filters: {}, ...o });
const plumbers = read({ text: "plumbers in Austin TX", task: "local_business", card_id: "local-business", subject: "plumbers", place: "Austin TX", chips: [{ key: "place", label: "Austin TX" }] });
const zip = read({ text: "78704", task: "local_business", card_id: "local-business", place: "78704", chips: [{ key: "place", label: "78704" }] });
const swe = read({ text: "software engineer at Google", task: "jobs", card_id: "competitor-hiring", subject: "Google", filters: { keyword: "software engineer", company: "Google" }, chips: [{ key: "company", label: "Google" }, { key: "keyword", label: "software engineer" }] });
const sweAustin = read({ ...swe, text: "software engineer at Google in Austin TX", place: "Austin TX", chips: [{ key: "company", label: "Google" }, { key: "keyword", label: "software engineer" }, { key: "place", label: "Austin TX" }] });

describe("local business", () => {
  it("a map search takes the keyword and the place in its words", () => {
    const fill = fillFromAsk(maps, plumbers);
    expect(fill.values.keyword).toBe("plumbers in Austin TX");
    expect(fill.unapplied).toEqual([]);
  });
  it("a place alone fills the place, and does not run on its own", () => {
    const fill = fillFromAsk(maps, zip);
    expect(fill.values.keyword).toBe("78704");
    expect(fill.unapplied).toEqual([]);
    expect(fill.complete).toBe(false);
  });
  it("a search with a place field and a category takes both", () => {
    const fill = fillFromAsk(yelp, plumbers);
    expect(fill.values.location).toBe("Austin TX");
    expect(fill.values.category).toBe("plumbers");
    expect(fill.unapplied).toEqual([]);
  });
});

describe("jobs", () => {
  it.each([[linkedinJobs, "keyword"], [indeedJobs, "keyword_search"]] as const)("%# keeps the role and the company", (source, field) => {
    const fill = fillFromAsk(source, sweAustin);
    expect(fill.values[field]).toBe("software engineer Google");
    expect(fill.values.location).toBe("Austin TX");
    expect(fill.unapplied).toEqual([]);
  });
  it("names whatever it could not apply", () => {
    const companyOnly = src("x_company", "keyword", [{ name: "company", required: true }]);
    const fill = fillFromAsk(companyOnly, { ...swe, filters: { ...swe.filters, keyword: "software engineer" }, task: "company_research" });
    expect(fill.values.company).toBe("Google");
    expect(fill.unapplied).toContain("software engineer");
  });
});
