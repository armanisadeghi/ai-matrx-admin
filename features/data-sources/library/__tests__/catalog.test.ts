import {
  cheapestPoints,
  countGroups,
  fieldWords,
  fieldPreview,
  librarySections,
  parseLibrary,
  pointsFor,
  pointsPerRecord,
  searchSources,
  sourceLine,
} from "../catalog";

const TODAY = {
  // Today's server answer: no groups, no featured, flat usd price.
  sources: [
    { key: "trustpilot_reviews", label: "Trustpilot reviews", group: "Local businesses and reviews", input: { kind: "url", fields: [{ name: "url", label: "Page address", required: true, example: "https://www.trustpilot.com/review/www.apple.com", type: "url" }] }, verified: true, usd_per_record: 0.0015 },
    { key: "yelp_reviews", label: "Yelp reviews", group: "Local businesses and reviews", input: { kind: "url", fields: [] }, verified: false, usd_per_record: 0.0015 },
    { key: "indeed_jobs", label: "Indeed jobs", group: "Companies and jobs", input: { kind: "keyword", fields: [{ name: "keyword", label: "Keyword", required: true }] }, verified: true, usd_per_record: 0.0015 },
    { key: "", label: "broken" },
    "junk",
  ],
  limits: { max_records_per_fetch: { value: 200, setting: "data_fetch.max_records_per_fetch" }, max_inputs_per_fetch: { value: 5, setting: "data_fetch.max_inputs_per_fetch" } },
};

const store = (i: number) => ({
  key: `store_${i}`,
  label: `Shop ${i} products`,
  group: "Ecommerce",
  subgroup: "Online stores",
  input: { mode: "discover", fields: [{ name: "url", label: "Store address", required: true }] },
  output_fields: ["title", "price", "sku"],
  verified_live: false,
  points_per_record: 30,
});

const RICH = {
  groups: [{ group: "Ecommerce", count: 31 }, { group: "Reviews", count: 1 }],
  sources: [
    {
      key: "amazon_product",
      label: "Amazon products",
      group: "Ecommerce",
      subgroup: "Marketplaces",
      description: "Product pages with price, rating and seller",
      input: { kind: "url", fields: [] },
      output_fields: ["title", { name: "final_price", label: "Price" }, "rating", "reviews_count", "seller_name", "asin"],
      featured: true,
      verified: true,
      verified_live: true,
      known_issue: null,
      points_per_record: 150,
      usd_per_record: 0.0075,
    },
    {
      key: "trustpilot_reviews",
      label: "Trustpilot reviews",
      group: "Reviews",
      input: { kind: "url", fields: [] },
      output_fields: ["review_id", "rating"],
      featured: false,
      verified_live: true,
      known_issue: { summary: "Slow for big companies" },
      points_per_record: 30,
    },
    ...Array.from({ length: 30 }, (_, i) => store(i)),
  ],
  limits: { max_records_per_fetch: { value: 50, setting: "data_fetch.max_records_per_fetch" } },
};

describe("parseLibrary", () => {
  it("reads today's answer and degrades honestly", () => {
    const lib = parseLibrary(TODAY);
    expect(lib.sources.map((s) => s.key)).toEqual(["trustpilot_reviews", "yelp_reviews", "indeed_jobs"]);
    expect(lib.groups).toEqual([
      { group: "Local businesses and reviews", count: 2 },
      { group: "Companies and jobs", count: 1 },
    ]);
    expect(lib.serverFeatured).toBe(false);
    // No featured flags → the confirmed sources are the shelf.
    expect(lib.sources.filter((s) => s.featured).map((s) => s.key)).toEqual(["trustpilot_reviews", "indeed_jobs"]);
    // A url source with no fields gets the address field.
    expect(lib.sources[1].input.fields[0]).toMatchObject({ name: "url", required: true });
    expect(lib.sources[2].input.kind).toBe("keyword");
    expect(lib.sources[0].outputFields).toEqual([]);
    expect(lib.limits.max_records_per_fetch?.value).toBe(200);
  });

  it("reads the rich answer: groups, labels, featured, known issue, per-source points, discover mode", () => {
    const lib = parseLibrary(RICH);
    expect(lib.groups[0]).toEqual({ group: "Ecommerce", count: 31 });
    const amazon = lib.sources[0];
    expect(amazon.outputFields).toEqual(["Title", "Price", "Rating", "Reviews count", "Seller name", "ASIN"]);
    expect(amazon.featured).toBe(true);
    expect(amazon.pointsPerRecord).toBe(150);
    expect(lib.sources[1].knownIssue).toBe("Slow for big companies");
    expect(lib.sources[1].featured).toBe(false);
    expect(lib.sources[2].input.kind).toBe("keyword");
    expect(lib.sources[2].confirmed).toBe(false);
    expect(lib.limits.max_inputs_per_fetch).toBeNull();
  });

  it("reads the server's group rows ({name, count})", () => {
    expect(parseLibrary({ sources: [], groups: [{ name: "Social", count: 35, featured_count: 11 }] }).groups).toEqual([{ group: "Social", count: 35 }]);
  });

  it("survives garbage", () => {
    expect(parseLibrary(null)).toMatchObject({ sources: [], groups: [] });
    expect(parseLibrary({ sources: "x", groups: [{}] }).sources).toEqual([]);
  });
});

describe("points", () => {
  const lib = parseLibrary(RICH);
  it("uses each source's OWN price, never a flat one", () => {
    expect(pointsPerRecord(lib.sources[0], 20000)).toBe(150);
    expect(pointsPerRecord(lib.sources[1], 20000)).toBe(30);
    expect(pointsFor(lib.sources[0], 10, 20000)).toBe(1500);
    expect(pointsFor(lib.sources[1], 10, null)).toBe(300);
  });
  it("falls back to the USD price at the organization's rate (20,000 points = $1), rounded up", () => {
    const src = { pointsPerRecord: null, usd_per_record: 0.0015 };
    expect(pointsPerRecord(src, 20000)).toBe(30);
    expect(pointsFor(src, 10, 20000)).toBe(300);
    expect(pointsFor({ pointsPerRecord: null, usd_per_record: 0.00001 }, 3, 20000)).toBe(1);
    expect(pointsFor(src, 10, null)).toBeNull();
    expect(pointsFor({ pointsPerRecord: null, usd_per_record: null }, 10, 20000)).toBeNull();
    expect(pointsFor(src, 0, 20000)).toBe(0);
  });
  it("finds the cheapest price for the hero line", () => {
    expect(cheapestPoints(lib.sources, 20000)).toBe(30);
    expect(cheapestPoints([], 20000)).toBeNull();
  });
});

describe("search", () => {
  const lib = parseLibrary(RICH);
  it("'reviews' finds every review source, label hits first", () => {
    const hits = searchSources(lib.sources, "reviews");
    expect(hits[0].key).toBe("trustpilot_reviews");
    // Amazon matches through its output field "Reviews count".
    expect(hits.map((s) => s.key)).toContain("amazon_product");
    expect(hits.some((s) => s.key.startsWith("store_"))).toBe(false);
  });
  it("matches singular and plural, every word, any order", () => {
    expect(searchSources(lib.sources, "review trustpilot").map((s) => s.key)).toEqual(["trustpilot_reviews"]);
    expect(searchSources(lib.sources, "shop 12").map((s) => s.key)).toEqual(["store_12"]);
    expect(searchSources(lib.sources, "zzzz")).toEqual([]);
    expect(searchSources(lib.sources, "  ")).toHaveLength(lib.sources.length);
  });
});

describe("sections", () => {
  const lib = parseLibrary(RICH);
  it("a huge subgroup becomes one compact list, never cards", () => {
    const secs = librarySections(lib.sources);
    const eco = secs.find((s) => s.group === "Ecommerce")!;
    expect(eco.count).toBe(31);
    expect(eco.cards.map((s) => s.key)).toEqual(["amazon_product"]);
    expect(eco.lists).toHaveLength(1);
    expect(eco.lists[0]).toMatchObject({ subgroup: "Online stores" });
    expect(eco.lists[0].sources).toHaveLength(30);
  });
  it("a small subgroup stays cards", () => {
    const secs = librarySections(lib.sources.slice(0, 5));
    expect(secs.find((s) => s.group === "Ecommerce")!.lists).toEqual([]);
  });
  it("counts groups when the server does not", () => {
    expect(countGroups(lib.sources)).toEqual([{ group: "Ecommerce", count: 31 }, { group: "Reviews", count: 1 }]);
  });
});

describe("field words", () => {
  it("cases acronyms", () => {
    expect(["review_id", "cb_rank", "url", "reviewsCount", "Marca"].map((f) => fieldWords(f))).toEqual(["Review ID", "CB rank", "URL", "Reviews count", "Marca"]);
  });
});

describe("card text", () => {
  const lib = parseLibrary(TODAY);
  it("previews fields and says what to enter", () => {
    expect(fieldPreview(["a", "b", "c", "d", "e", "f"], 4)).toEqual({ shown: ["a", "b", "c", "d"], more: 2 });
    expect(fieldPreview(["URL", "ID", "Title", "Price", "Seller URL"], 2)).toEqual({ shown: ["Title", "Price"], more: 3 });
    expect(sourceLine(lib.sources[0])).toBe("From a page address");
    expect(sourceLine(lib.sources[2])).toBe("Search by keyword");
  });
});
