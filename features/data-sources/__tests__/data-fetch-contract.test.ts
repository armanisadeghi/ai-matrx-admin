import {
  DataFetchRefusal,
  buildInput,
  capCount,
  consumeDataFetch,
  countChoices,
  estimateUsd,
  getMoreCount,
  inputFieldsFor,
  parseResult,
  quotePoints,
  searchOptions,
  parseSpec,
  refusalOf,
  groupSources,
  matchSourceForUrl,
  parseCatalog,
  parseJob,
  type DataSource,
} from "../contract";
import { dataTableOffer } from "../offer";
import { provenanceOf, readDataFetchMeta, withDataFetchMeta, getDataSource } from "../../board/data-fetch/tile-meta";

const CATALOG = parseCatalog({
  sources: [
    {
      key: "trustpilot_reviews",
      label: "Trustpilot reviews",
      group: "Reviews",
      input: { kind: "url", fields: [{ name: "url", label: "Company page", required: true, example: "https://www.trustpilot.com/review/acme.com" }] },
      example_url: "https://www.trustpilot.com/review/acme.com",
      verified: true,
      usd_per_record: 0.0025,
    },
    {
      key: "google_maps_places",
      label: "Google Maps places",
      group: "Places",
      input: { kind: "url", fields: [] },
      example_url: "https://www.google.com/maps/place/Blue+Bottle+Coffee",
      verified: true,
      usd_per_record: 0.003,
    },
    {
      key: "google_maps_unverified",
      label: "Google Maps reviews",
      group: "Reviews",
      input: { kind: "url", fields: [] },
      example_url: "https://www.google.com/maps/place/x",
      verified: false,
      usd_per_record: 0.003,
    },
    {
      key: "indeed_jobs",
      label: "Indeed jobs",
      group: "Jobs",
      input: { kind: "keyword", fields: [{ name: "keyword", label: "Job title", required: true }, { name: "location", label: "Location", required: false }] },
      verified: true,
      usd_per_record: null,
    },
    { label: "no key — dropped" },
  ],
  limits: { max_records_per_fetch: { value: 500, setting: "data_fetch.max_records_per_fetch" }, max_inputs_per_fetch: { value: 5, setting: "data_fetch.max_inputs_per_fetch" } },
});

const byKey = (k: string) => CATALOG.sources.find((s) => s.key === k) as DataSource;

describe("catalog parsing", () => {
  it("keeps valid sources, drops keyless ones, and gives a url source with no fields one Link field", () => {
    expect(CATALOG.sources.map((s) => s.key)).toEqual(["trustpilot_reviews", "google_maps_places", "google_maps_unverified", "indeed_jobs"]);
    expect(byKey("google_maps_places").input.fields).toEqual([
      { name: "url", label: "Link", required: true, example: "https://www.google.com/maps/place/Blue+Bottle+Coffee" },
    ]);
    expect(CATALOG.limits.max_records_per_fetch).toEqual({ value: 500, setting: "data_fetch.max_records_per_fetch" });
  });
});

describe("how many", () => {
  it("caps at the limit and never below one", () => {
    expect(capCount(800, 500)).toBe(500);
    expect(capCount(0, 500)).toBe(1);
    expect(capCount(37.9, 500)).toBe(37);
    expect(capCount(800, null)).toBe(800);
  });
  it("shows every quick choice and marks the ones over the limit", () => {
    expect(countChoices(100)).toEqual([
      { value: 10, allowed: true },
      { value: 50, allowed: true },
      { value: 100, allowed: true },
      { value: 500, allowed: false },
    ]);
  });
});

describe("estimate", () => {
  it("prices n records; an unpriced source has no estimate (never zero)", () => {
    expect(estimateUsd(byKey("trustpilot_reviews"), 25)).toBeCloseTo(0.0625);
    expect(estimateUsd(byKey("trustpilot_reviews"), 0)).toBeNull();
    expect(estimateUsd(byKey("indeed_jobs"), 25)).toBeNull();
  });
});

describe("source list", () => {
  it("groups in catalog order and filters by every word", () => {
    expect(groupSources(CATALOG.sources, "").map((g) => g.group)).toEqual(["Reviews", "Places", "Jobs"]);
    expect(groupSources(CATALOG.sources, "maps rev").flatMap((g) => g.sources.map((s) => s.key))).toEqual(["google_maps_unverified"]);
  });
  it("builds the fetch input and names what is missing", () => {
    expect(buildInput(byKey("indeed_jobs"), { location: "Austin" })).toEqual({ input: null, missing: ["Job title"] });
    expect(buildInput(byKey("indeed_jobs"), { keyword: " plumber ", location: "Austin" }).input).toEqual({ inputs: [{ keyword: "plumber", location: "Austin" }] });
    expect(buildInput(byKey("trustpilot_reviews"), { url: "https://www.trustpilot.com/review/stripe.com" }).input).toEqual({ url: "https://www.trustpilot.com/review/stripe.com" });
  });
});

describe("paste a link → offer", () => {
  it("matches host and first path segment, verified first", () => {
    expect(matchSourceForUrl("https://www.google.com/maps/place/Joe's+Pizza/@40.7,-73.9", CATALOG.sources)?.key).toBe("google_maps_places");
    expect(matchSourceForUrl("https://uk.trustpilot.com/review/stripe.com", CATALOG.sources)?.key).toBe("trustpilot_reviews");
    expect(matchSourceForUrl("https://www.google.com/search?q=pizza", CATALOG.sources)).toBeNull();
    expect(matchSourceForUrl("https://example.com/", CATALOG.sources)).toBeNull();
  });
  it("offers only for one address, never for text or several lines", () => {
    expect(dataTableOffer("https://www.google.com/maps/place/Joe's+Pizza", CATALOG.sources)?.source.key).toBe("google_maps_places");
    expect(dataTableOffer("trustpilot.com/review/stripe.com", CATALOG.sources)?.url).toBe("https://trustpilot.com/review/stripe.com");
    expect(dataTableOffer("look at https://www.google.com/maps/place/x", CATALOG.sources)).toBeNull();
    expect(dataTableOffer("https://www.google.com/maps/place/a\nhttps://www.google.com/maps/place/b", CATALOG.sources)).toBeNull();
  });
});

async function* events(list: unknown[]) {
  for (const e of list) yield e;
}

describe("stream", () => {
  it("reports stages and returns the result", async () => {
    const seen: string[] = [];
    const result = await consumeDataFetch(
      events([
        { event: "data", data: { type: "data_fetch_stage", stage: "fetching", label: "Fetching reviews", current: 10, total: 25, job_id: "j1" } },
        { event: "data", data: { type: "data_fetch_result", result: { job_id: "j1", table_id: "t1", table_name: "Stripe reviews", rows_created: 25, rows_updated: 0, records_billed: 25, cost_usd: 0.06, columns: ["rating"], values_as_text: 2, limit_applied: null } } },
        { event: "end" },
      ]),
      (p) => seen.push(`${p.label} ${p.current}/${p.total} ${p.jobId}`),
    );
    expect(seen).toEqual(["Fetching reviews 10/25 j1"]);
    expect(result).toMatchObject({ table_id: "t1", rows_created: 25, values_as_text: 2 });
  });
  it("throws the refusal with its words and limit", async () => {
    await expect(
      consumeDataFetch(events([{ event: "error", data: { code: "limit_exceeded", user_message: "That is more than your limit.", limit: { setting: "data_fetch.max_records_per_fetch", value: 500 } } }])),
    ).rejects.toMatchObject({ code: "limit_exceeded", userMessage: "That is more than your limit.", limit: { value: 500 } });
  });
  it("a stream with no result is a refusal, never a silent success", async () => {
    await expect(consumeDataFetch(events([{ event: "end" }]))).rejects.toBeInstanceOf(DataFetchRefusal);
  });
  it("reads a job: running, done, failed", () => {
    expect(parseJob({ status: "running", label: "Waiting for results", current: 0 }, "j1")).toMatchObject({ state: "running", progress: { label: "Waiting for results", jobId: "j1" } });
    expect(parseJob({ status: "done", result: { table_id: "t1" } }, "j1")).toMatchObject({ state: "done", result: { table_id: "t1", job_id: "j1" } });
    expect(parseJob({ status: "failed", error: { code: "x", user_message: "No reviews found." } }, "j1")).toMatchObject({ state: "failed", refusal: { userMessage: "No reviews found." } });
  });
});

describe("tile meta", () => {
  it("round-trips a draft and builds provenance that adds rows", () => {
    const src = getDataSource({ sourceKey: "trustpilot_reviews", values: { url: "u" } });
    expect(src).toMatchObject({ kind: "entity", entity: "data-table", id: null });
    const meta = src.kind === "entity" ? src.meta : undefined;
    expect(readDataFetchMeta(meta)?.draft?.sourceKey).toBe("trustpilot_reviews");
    const req = { sourceKey: "trustpilot_reviews", sourceLabel: "Trustpilot reviews", input: { url: "u" }, count: 25 };
    const result = { job_id: "j", table_id: "t", table_name: "n", rows_created: 25, rows_updated: 0, records_billed: 25, cost_usd: 0, columns: [], values_as_text: 0, limit_applied: null };
    const first = provenanceOf(result, req);
    const second = provenanceOf({ ...result, rows_created: 10 }, req, first);
    expect(second.rows).toBe(35);
    expect(readDataFetchMeta(withDataFetchMeta({ other: "x" }, { fetched: second }))?.fetched?.rows).toBe(35);
  });
});

describe("server deltas (aidream data_fetch FEATURE.md)", () => {
  it("Get more quotes the FULL new count (overlap is re-billed), capped at the limit", () => {
    expect(getMoreCount(25, 25, 500)).toBe(50);
    expect(getMoreCount(480, 25, 500)).toBe(500);
  });
  it("reads a refusal's limit from details", () => {
    const r = refusalOf({ code: "input_error", user_message: "Too many pages.", details: { limit: { setting: "knowledge.scraper.site_data_max_inputs_per_fetch", value: 10 } } });
    expect(r.limit).toEqual({ setting: "knowledge.scraper.site_data_max_inputs_per_fetch", value: 10 });
  });
  it("parses the table's spec row", () => {
    expect(parseSpec({ id: "j", source_key: "trustpilot_reviews", max_records: 25, status: "done", rows_created: 25, rows_updated: 0, finished_at: "2026-10-11T20:00:00Z" })).toMatchObject({ jobId: "j", maxRecords: 25 });
    expect(parseSpec(null)).toBeNull();
  });
});

describe("keyword mode (By search) and per-source prices", () => {
  const maps = parseCatalog({
    points_per_usd: 20000,
    usd_per_record_default: 0.0015,
    sources: [
      {
        key: "maps_places",
        label: "Places",
        group: "Maps",
        input: {
          kind: "url",
          fields: [
            { name: "url", label: "Place link", required: true, type: "url" },
            { name: "keyword", label: "Keyword", required: false, example: "dentist" },
            { name: "country", label: "Country", required: false, example: "US" },
          ],
          discover_options: { keywords: ["keyword", "country"] },
        },
        usd_per_record: 0.002,
        points_per_record: 40,
      },
      { key: "plain", label: "Plain", group: "Maps", input: { kind: "url", fields: [{ name: "url", label: "Link", required: true }] }, usd_per_record: null },
    ],
  });
  const places = maps.sources[0];

  it("reads the discover options and offers them as search modes with the option's fields", () => {
    expect(places.input.discover_options).toEqual({ keywords: ["keyword", "country"] });
    expect(searchOptions(places).map((o) => [o.name, o.fields.map((f) => f.name)])).toEqual([["keywords", ["keyword", "country"]]]);
    expect(searchOptions(maps.sources[1])).toEqual([]);
  });
  it("by link asks only for the link; by search asks for the option's fields and sends inputs", () => {
    expect(inputFieldsFor(places, null).map((f) => f.name)).toEqual(["url"]);
    expect(inputFieldsFor(places, "keywords").map((f) => f.name)).toEqual(["keyword", "country"]);
    expect(buildInput(places, { url: "https://x.com/a" }, null).input).toEqual({ url: "https://x.com/a" });
    expect(buildInput(places, { keyword: "dentist" }, "keywords")).toEqual({ input: null, missing: ["Country"] });
    expect(buildInput(places, { keyword: " dentist ", country: "US", url: "ignored" }, "keywords").input).toEqual({
      inputs: [{ keyword: "dentist", country: "US" }],
    });
  });
  it("quotes each source's own points price; a null price takes the catalog default", () => {
    expect(quotePoints(places, 5)).toBe(200);
    expect(maps.sources[1].usd_per_record).toBe(0.0015);
    expect(maps.sources[1].points_per_record).toBe(30);
    expect(quotePoints(maps.sources[1], 5)).toBe(150);
    expect(quotePoints({ points_per_record: null }, 5)).toBeNull();
  });
  it("carries the result's notices and key basis", () => {
    const r = parseResult({ job_id: "j", table_id: "t", key_basis: "record_hash", notices: ["Fingerprint keys", "", 4] });
    expect(r?.notices).toEqual(["Fingerprint keys"]);
    expect(r?.key_basis).toBe("record_hash");
  });
});

describe("paste a link → the server's url_pattern regexes", () => {
  const GOOGLE = String.raw`(^|\.)google\.[a-z.]+$`;
  const patterned = parseCatalog({
    sources: [
      { key: "trustpilot_reviews", label: "Trustpilot reviews", group: "Reviews", input: { kind: "url", fields: [] }, verified_live: true, verified: true, url_pattern: { host: String.raw`(^|\.)trustpilot\.com$`, path: "^/review/" } },
      { key: "google_maps_place", label: "Google Maps place", group: "Places", input: { kind: "url", fields: [] }, verified: true, url_pattern: { host: GOOGLE, path: String.raw`^/maps/place/.*(data=.*!1s0x|[?&]q=place_id:)` } },
      { key: "google_maps_reviews", label: "Google Maps reviews", group: "Places", input: { kind: "url", fields: [] }, verified: false, url_pattern: { host: GOOGLE, path: "^/maps/place/" } },
      { key: "amazon_product", label: "Amazon product", group: "Shopping", input: { kind: "url", fields: [] }, verified: true, url_pattern: { host: String.raw`(^|\.)amazon\.[a-z.]+$`, path: String.raw`(/dp/|/gp/product/)` } },
      { key: "linkedin_company", label: "LinkedIn company", group: "Companies", input: { kind: "url", fields: [] }, verified: true, url_pattern: { host: String.raw`(^|\.)linkedin\.com$`, path: "^/company/" } },
      // no pattern: the example address is the fallback
      { key: "old_style", label: "Old style", group: "Other", input: { kind: "url", fields: [] }, verified: true, example_url: "https://shop.example.org/item/1" },
    ],
  });
  const key = (u: string) => matchSourceForUrl(u, patterned.sources)?.key ?? null;
  it("Trustpilot", () => {
    expect(key("https://www.trustpilot.com/review/stripe.com")).toBe("trustpilot_reviews");
    expect(key("https://www.trustpilot.com/categories")).toBeNull();
  });
  it("a Google Maps place_id link is the place source; a name-only link is reviews-only", () => {
    expect(key("https://www.google.com/maps/place/?q=place_id:ChIJN1t_tDeuEmsRUsoyG83frY4")).toBe("google_maps_place");
    expect(key("https://www.google.com/maps/place/Joe/data=!4m2!3m1!1s0x80dcd5f8d1b5b:0x1")).toBe("google_maps_place");
    expect(key("https://www.google.com/maps/place/Joe's+Pizza/@40.7,-73.9")).toBe("google_maps_reviews");
    expect(key("https://www.google.com/search?q=pizza")).toBeNull();
  });
  it("an Amazon /dp/ link on any Amazon domain", () => {
    expect(key("https://www.amazon.com/Some-Product-Name/dp/B08N5WRWNW/ref=sr_1_1")).toBe("amazon_product");
    expect(key("https://www.amazon.co.uk/gp/product/B08N5WRWNW")).toBe("amazon_product");
    expect(key("https://www.amazon.com/s?k=lamp")).toBeNull();
  });
  it("a LinkedIn company link, not a person", () => {
    expect(key("https://www.linkedin.com/company/stripe/")).toBe("linkedin_company");
    expect(key("https://www.linkedin.com/in/someone")).toBeNull();
  });
  it("a source without a pattern keeps the example-address rule", () => {
    expect(key("https://shop.example.org/item/99")).toBe("old_style");
  });
});
