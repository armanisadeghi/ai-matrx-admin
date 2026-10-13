/**
 * The run story: steps in the order they finished, each engine's searches on one row with the exact
 * queries, a single-call step merged with its call, steps that did nothing greyed with the
 * definition's `ready_when`, and a derived value traced to the place in the raw response it came from.
 */
import { buildStory, derivedFor, findInResponse } from "../story";
import { serverRequestRows } from "../requests";
import type { NodeOutcomeRow, RunTruth } from "../data";
import type { BuilderEntry } from "../types";

function search(seq: number, provider: string, q: string, link: string) {
  return {
    seq,
    at: `2026-10-13T19:19:3${seq}.000Z`,
    ms: 500,
    kind: "search",
    provider,
    label: `${provider === "google" ? "Google" : "Brave"} web: "${q}"`,
    status: 200,
    error: null,
    request: { q },
    response: { body: { organic_results: [{ link: "https://example.org/x" }, { link }] } },
  };
}

function outcome(id: string, nodeId: string, at: string, output: Record<string, unknown>): NodeOutcomeRow {
  return { id, runId: "run-1", nodeId, step: 0, attempt: 1, itemIndex: 0, completedAt: at, durationMs: 100, input: { from: nodeId }, output: output as never, error: null };
}

const outcomes: NodeOutcomeRow[] = [
  outcome("o-deep", "deep", "2026-10-13T19:19:30.000Z", { skipped: false, requests: [], evidence: [], cost_usd: 0 }),
  outcome("o-probe", "probe", "2026-10-13T19:19:31.000Z", {
    requests: [{ seq: 1, at: "2026-10-13T19:19:31.000Z", ms: 200, kind: "page_fetch", provider: "http", label: "GET https://ritualcoffee.com/", status: 200, error: null, request: { url: "https://ritualcoffee.com/" }, response: { body: "<html>" } }],
    evidence: [{ key: "website" }],
  }),
  outcome("o-web", "web", "2026-10-13T19:19:40.000Z", {
    cost_usd: 0.02,
    evidence: [{ key: "listing" }],
    requests: [
      search(1, "brave", "ritualcoffee.com", "https://www.yelp.com/biz/ritual"),
      search(2, "google", "ritualcoffee.com", "https://www.yelp.com/biz/ritual"),
      search(3, "google", "Ritual Coffee Roasters", "https://tripadvisor.com/r"),
    ],
  }),
];

const truth: RunTruth = {
  runs: [{ id: "run-1", definitionId: "def-1", status: "completed", createdAt: "2026-10-13T19:19:29.000Z", startedAt: "2026-10-13T19:19:29.000Z", completedAt: "2026-10-13T19:19:41.000Z", input: {} }],
  outcomes,
  snapshots: [],
  definitions: [
    {
      id: "def-1",
      name: "Smart Add Brand — Identify",
      nodes: [
        { id: "probe", label: "Check the website", icon: "globe", readyWhen: [] },
        { id: "web", label: "Search the web", icon: "search", readyWhen: ["website"] },
        { id: "deep", label: "News, videos and images", icon: "newspaper", readyWhen: ["woken.name"] },
        { id: "local", label: "Local listings", icon: "map-pin", readyWhen: ["confirmed.name", "woken.location"] },
      ],
    },
  ],
};

function entry(key: string, group: BuilderEntry["group"], data: unknown, fromNodes: string[] | null = null): BuilderEntry {
  return { key, label: key, group, data, at: 1, firstAt: 1, history: [], fromNodes };
}

const entries = [
  entry("input.website", "inputs", "ritualcoffee.com"),
  entry("finding.yelp", "derived", { url: "https://www.yelp.com/biz/ritual", engines: ["brave", "google"], source: { url: "https://www.yelp.com/biz/ritual" } }, ["web"]),
];

describe("builder run story", () => {
  const story = buildStory(entries, [{ runId: "run-1", label: "Identify round 1", at: 0 }], truth, serverRequestRows(outcomes));

  it("tells the run in order with the exact queries per engine", () => {
    expect(story.map((r) => [r.number, r.title, r.status])).toEqual([
      ["0", "What the person typed", null],
      [null, "Identify round 1", "done"],
      ["1", "Check the website", "done"],
      ["2", "Search the web", "done"],
      ["2.1", "Brave", "done"],
      ["2.2", "Google", "done"],
      ["3", "News, videos and images", "skipped"],
      ["4", "Local listings", "skipped"],
    ]);
    expect(story.find((r) => r.title === "Check the website")?.detail).toBe("GET https://ritualcoffee.com/");
    expect(story.find((r) => r.title === "Google")?.detail).toBe('"ritualcoffee.com" · "Ritual Coffee Roasters"');
    expect(story.find((r) => r.title === "Google")?.calls).toHaveLength(2);
    expect(story.find((r) => r.number === "3")?.reason).toBe("waits for: name confirmed");
    expect(story.find((r) => r.number === "4")?.reason).toBe("waits for: name confirmed · location confirmed");
  });

  it("traces a derived value to its place in the raw response", () => {
    const google = story.find((r) => r.title === "Google");
    if (!google) throw new Error("no Google row");
    expect(derivedFor(google, entries).map((e) => e.key)).toEqual(["finding.yelp"]);
    expect(findInResponse(google.calls[0].response, entries[1])).toBe("body.organic_results[1].link");
  });
});
