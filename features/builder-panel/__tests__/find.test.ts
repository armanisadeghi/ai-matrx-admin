/**
 * Finding things in the Builder panel's long lists: one search grammar, body search with the place
 * it matched, the narrowing filters, sort, and story/value search that keeps structure.
 */
import { EMPTY_REQUEST_FIND, findActivity, findEntries, findRequests, findStory, highlightParts, parseQuery, requestMatch } from "../find";
import type { ActivityRow, RequestRow } from "../requests";

function row(over: Partial<RequestRow>): RequestRow {
  return {
    id: over.id ?? "r",
    side: "server",
    at: 0,
    ms: 100,
    kind: "search",
    provider: "google",
    title: "Google web: fullspecstaff.com",
    status: 200,
    error: null,
    runId: "run-1",
    nodeId: "web",
    request: { url: "https://api.search.brave.com/res/v1/web/search", args: { q: "fullspecstaff.com", extra_snippets: true } },
    response: { results: [{ url: "https://www.zoominfo.com/c/full-spectrum-search-group" }] },
    ...over,
  };
}

const rows: RequestRow[] = [
  row({ id: "a", at: 1, ms: 500, provider: "google" }),
  row({ id: "b", at: 2, ms: 4000, provider: "brave", title: "Brave news: Full Spectrum", response: { nothing: true } }),
  row({ id: "c", at: 3, ms: 50, side: "page", provider: "db.matrxserver.com", kind: "http", title: "GET /rest/v1/x", nodeId: null, status: 500, request: { url: "https://db.matrxserver.com/rest/v1/x" }, response: null }),
  row({ id: "d", at: 4, ms: null, provider: "brightdata", kind: "social_profile", title: "linkedin profile", status: null, nodeId: "accounts" }),
];

describe("parseQuery", () => {
  it("AND-s words, lowercases, and treats -word as an exclusion", () => {
    expect(parseQuery("  Google  -Brave ")).toEqual({ include: ["google"], exclude: ["brave"] });
    expect(parseQuery("-")).toEqual({ include: ["-"], exclude: [] });
  });
});

describe("requestMatch", () => {
  it("says where the words were found", () => {
    expect(requestMatch(rows[0], parseQuery("google"))).toBe("row");
    expect(requestMatch(rows[0], parseQuery("extra_snippets"))).toBe("request");
    expect(requestMatch(rows[0], parseQuery("zoominfo"))).toBe("response");
    expect(requestMatch(rows[0], parseQuery("nowhere"))).toBeNull();
  });
  it("excludes on a word anywhere, bodies included", () => {
    expect(requestMatch(rows[0], parseQuery("google -zoominfo"))).toBeNull();
  });
  it("matches the step label", () => {
    expect(requestMatch(rows[3], parseQuery("fetch accounts"), "Fetch the accounts")).toBe("row");
  });
});

describe("findRequests", () => {
  const ids = (f: Partial<typeof EMPTY_REQUEST_FIND>) => findRequests(rows, { ...EMPTY_REQUEST_FIND, ...f }).map((x) => x.row.id);
  it("returns everything in time order with no filter", () => expect(ids({})).toEqual(["a", "b", "c", "d"]));
  it("narrows by source (the badge's value)", () => {
    expect(ids({ source: "brave" })).toEqual(["b"]);
    expect(ids({ source: "page" })).toEqual(["c"]);
  });
  it("narrows by status", () => {
    expect(ids({ status: "failed" })).toEqual(["c"]);
    expect(ids({ status: "pending" })).toEqual(["d"]);
    expect(ids({ status: "slow" })).toEqual(["b"]);
    expect(ids({ status: "ok" })).toEqual(["a", "b"]);
  });
  it("narrows by step and kind", () => {
    expect(ids({ step: "accounts" })).toEqual(["d"]);
    expect(ids({ kind: "http" })).toEqual(["c"]);
  });
  it("sorts newest and slowest first", () => {
    expect(ids({ sort: "newest" })).toEqual(["d", "c", "b", "a"]);
    expect(ids({ sort: "slowest" })).toEqual(["b", "a", "c", "d"]);
  });
});

describe("findActivity / findEntries", () => {
  const act = (id: string, kind: string, title: string): ActivityRow => ({ id, at: 0, kind, title, costUsd: null, ms: null, status: null, requestId: null, runId: null, nodeId: null, snapshotId: null });
  it("filters activity by words and kind", () => {
    const list = [act("1", "request", "Searched: Google web"), act("2", "step", "Finished: Search the web")];
    expect(findActivity(list, "search", "").map((r) => r.id)).toEqual(["1", "2"]);
    expect(findActivity(list, "search", "step").map((r) => r.id)).toEqual(["2"]);
  });
  it("filters values by label, key and source", () => {
    const list = [{ key: "inputs.url", label: "Website", source: "typed" }, { key: "ai.brand", label: "Brand", source: "agent" }];
    expect(findEntries(list, "agent").map((e) => e.key)).toEqual(["ai.brand"]);
  });
});

describe("findStory", () => {
  const s = (kind: string, number: string | null, title: string, detail: string | null = null) => ({ kind, number, title, detail, reason: null, status: null });
  const story = [
    s("inputs", "0", "What the person typed"),
    s("run", null, "Identify round 1"),
    s("step", "3", "Search the web"),
    s("call", "3.1", "Google", '"fullspecstaff.com"'),
    s("call", "3.2", "Brave"),
    s("step", "4", "Fetch the accounts"),
    s("call", "4.1", "Instagram lookup"),
    s("run", null, "Identify round 2"),
    s("step", "3", "Search the web"),
    s("call", "3.1", "Bing"),
  ];
  it("keeps a matching call's step and its run header", () => {
    expect(findStory(story, "fullspecstaff").map((r) => r.title)).toEqual(["Identify round 1", "Search the web", "Google"]);
  });
  it("drops runs with no match", () => {
    expect(findStory(story, "instagram").map((r) => r.title)).toEqual(["Identify round 1", "Fetch the accounts", "Instagram lookup"]);
    expect(findStory(story, "bing").map((r) => r.title)).toEqual(["Identify round 2", "Search the web", "Bing"]);
  });
});

describe("highlightParts", () => {
  it("marks every word case-insensitively", () => {
    expect(highlightParts("Google web: Google", "google")).toEqual([
      { text: "Google", hit: true },
      { text: " web: ", hit: false },
      { text: "Google", hit: true },
    ]);
  });
});
