import { discoveryRecord, inferMode, parseDiscoverResult, readDiscoverEvent } from "../discovery";

describe("the box tells a concept from a list", () => {
  it.each([
    ["best bike shops in Bend", "local_business"],
    ["dentists near 92101", "local_business"],
    ["Italian restaurants in Asheville", "local_business"],
    ["best online therapy services", "companies_reviews"],
    ["payroll software for small business", "companies_reviews"],
    ["noise-cancelling headphones under $300", "companies_reviews"],
    ["who competes with @handle", "companies_reviews"],
    ["top fitness creators on TikTok", "companies_reviews"],
    ["competitors of gusto.com", "companies_reviews"],
  ] as const)("%s is a concept: Find for me", (text, kind) => {
    expect(inferMode(text, kind)).toBe("find");
  });

  it.each([
    ["Hydro Flask vs Yeti", "companies_reviews"],
    ["hydroflask.com, yeti.com", "companies_reviews"],
    ["Sparrow Bakery, Bend OR vs Looney Bean in Bend, OR", "local_business"],
    ["best pizza vs best tacos", "companies_reviews"],
  ] as const)("%s is a list: Compare these", (text, kind) => {
    expect(inferMode(text, kind)).toBe("compare");
  });
});

const RESULT = {
  kind: "local_business",
  reading: { kind: "local_business", branch: "A", mode: "places", topic: "bike shops", area: "Bend, OR", platform: "",
    handle: "", of: "", price_max: null, needs: null, summary: "Map search · bike shops near Bend, OR", searches: 1, points: 300 },
  disclosure: "Top results from a map search for bike shops near Bend, OR",
  how: ["In the map's own order: relevance, distance and ratings."],
  guessed: false,
  items: [
    { rank: 1, preselected: true, note: "", match: { item: { label: "Sunnyside Sports", inputs: { place_id: "ChIJ1" } },
      name: "Sunnyside Sports", detail: "930 NW Newport Ave", logo_url: null, website: "sunnysidesports.com",
      url: "https://www.google.com/maps/place/?q=place_id:ChIJ1", rating: 4.9, reviews_count: 828 } },
    { rank: 2, preselected: false, note: "", match: { item: { label: "Bend Velo", inputs: { place_id: "ChIJ2" } },
      name: "Bend Velo", detail: "341 NE Emerson Ave", logo_url: null, website: null, url: null, rating: null, reviews_count: null } },
  ],
  searches: 1, points: 300, notes: [],
};

describe("the found list off the wire", () => {
  it("reads stages, the result and a refusal", () => {
    expect(readDiscoverEvent({ event: "data", data: { type: "discover_stage", label: "Searching the map" } }))
      .toEqual({ kind: "stage", label: "Searching the map" });
    const r = readDiscoverEvent({ event: "data", data: { type: "discover_result", result: RESULT } });
    expect(r?.kind).toBe("result");
    const refused = readDiscoverEvent({ event: "error", data: { code: "needs_area", user_message: "Add a city" } });
    expect(refused?.kind === "refusal" && refused.refusal.code).toBe("needs_area");
  });

  it("keeps the source's order, preselection and the place id each item reads", () => {
    const res = parseDiscoverResult(RESULT)!;
    expect(res.items.map((i) => [i.rank, i.preselected, i.match.item.inputs])).toEqual([
      [1, true, { place_id: "ChIJ1" }], [2, false, { place_id: "ChIJ2" }]]);
    expect(res.reading.area).toBe("Bend, OR");
  });

  it("records how the list was found, and what the person kept, removed and added", () => {
    const res = parseDiscoverResult(RESULT)!;
    const rows = [
      { match: res.items[0].match, rank: 1, picked: true },
      { match: res.items[1].match, rank: 2, picked: false },
      { match: { ...res.items[1].match, name: "Hutch's" }, rank: null, picked: true },
    ];
    const rec = discoveryRecord(" best bike shops in Bend ", res, rows);
    expect(rec).toMatchObject({ branch: "A", mode: "places", method: "Map search", concept: "best bike shops in Bend",
      disclosure: RESULT.disclosure, guessed: false });
    expect(rec.candidates).toEqual([
      { rank: 1, name: "Sunnyside Sports", detail: "930 NW Newport Ave", kept: true, added: false },
      { rank: 2, name: "Bend Velo", detail: "341 NE Emerson Ave", kept: false, added: false },
      { rank: null, name: "Hutch's", detail: "341 NE Emerson Ave", kept: true, added: true },
    ]);
  });
});
