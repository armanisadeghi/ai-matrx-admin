/**
 * The Overview's pure decisions: which Tools it finds by job and what they cost together; one score per
 * source side by side with the source named only when it is a leader (R-1: aggregators read "Matrx"); the
 * phrases a list box sends.
 */
import type { CatalogToolHit, ToolCallView } from "@ai-matrx/agents/tools";

import { authorityTile, authorityTiles, bandOf } from "../authority";
import { arrangeSeoTools, pointsTogether, splitPhrases, withLists } from "../seoTools";

const hit = (job_key: string, price: number | null): CatalogToolHit => ({
  tool_id: `id-${job_key}`,
  job_key,
  display_name: job_key,
  display_noun: "Report",
  summary: "",
  job_family: "seo",
  price_hint_points: price,
  reliability: { success_rate: null, samples: 0, p50_ms: null, last_success_at: null },
  state: "live",
});

const view = (over: Partial<ToolCallView>): ToolCallView => ({
  call_id: "c1",
  tool_id: "t1",
  tool_name: null,
  display_name: null,
  status: "succeeded",
  stage: null,
  stage_label: null,
  output: null,
  display_source: "Matrx",
  ignored_filters: [],
  points_held: 0,
  points_charged: 0,
  cache: "none",
  error: null,
  approval: null,
  raw: null,
  created_at: null,
  finished_at: null,
  latency_ms: null,
  ...over,
});

describe("finding the SEO Tools by job", () => {
  it("arranges hits under this screen's names and leaves a job the catalog does not serve out", () => {
    const tools = arrangeSeoTools([hit("seo_domain_authority", 134), hit("seo_backlinks_summary", 482), hit("social_search", 38)]);
    expect(Object.keys(tools).sort()).toEqual(["authority", "links"]);
    expect(tools.authority?.price_hint_points).toBe(134);
  });

  it("adds prices together, and says nothing when one price is unknown", () => {
    expect(pointsTogether([hit("a", 134), hit("b", 482), hit("c", 20)])).toBe(636);
    expect(pointsTogether([hit("a", 134), hit("b", null)])).toBeNull();
    expect(pointsTogether([hit("a", 134), undefined])).toBeNull();
  });
});

describe("the authority row", () => {
  it("names a leader as the source of its own score and 'Matrx' for our own link strength", () => {
    const tiles = authorityTiles(
      {
        authority: view({ output: { domain_authority: 31 }, points_charged: 134 }),
        links: view({ output: { rank: 46 }, points_charged: 482 }),
        searchAds: view({ output: { site_strength: 49 }, points_charged: 20 }),
      },
      { authority: null, links: null, searchAds: null },
    );
    expect(tiles.map((t) => [t.label, t.source, t.score, t.points])).toEqual([
      ["Domain Authority", "Moz", 31, 134],
      ["Link strength", "Matrx", 46, 482],
      ["Site strength", "SpyFu", 49, 20],
    ]);
  });

  it("never prints an aggregator's own name even if one arrives as the display source", () => {
    const tile = authorityTile("links", view({ output: { rank: 46 }, display_source: "Matrx" }), null);
    expect(tile.source).toBe("Matrx");
  });

  it("is idle before a press, running while it works, and honest when nothing came back", () => {
    expect(authorityTile("authority", null, null).status).toBe("idle");
    expect(authorityTile("authority", view({ status: "running" }), null).status).toBe("running");
    const none = authorityTile("authority", view({ output: { domain: "x.com" } }), null);
    expect(none.status).toBe("empty");
    expect(none.score).toBeNull();
    expect(authorityTile("authority", view({ status: "empty", points_charged: 0 }), null).note).toMatch(/No score/);
  });

  it("carries a failed call's own words and a lost connection's", () => {
    const failed = authorityTile("links", view({ status: "failed", error: { code: "all_sources_failed", message: "No source could answer right now." } }), null);
    expect(failed.status).toBe("failed");
    expect(failed.note).toBe("No source could answer right now.");
    expect(authorityTile("links", null, "Could not be reached").status).toBe("failed");
  });

  it("clamps a score into 0-100 and bands it in plain words", () => {
    expect(authorityTile("authority", view({ output: { domain_authority: 140 } }), null).score).toBe(100);
    expect([bandOf(85), bandOf(61), bandOf(40), bandOf(25), bandOf(3), bandOf(null)]).toEqual(["Excellent", "Strong", "Good", "Fair", "Low", ""]);
  });
});

describe("the keyword box sends a real list", () => {
  it("splits lines and commas, trims, and drops repeats", () => {
    expect(splitPhrases("cold brew coffee maker\n leather wallet ,cold brew coffee maker\n\n")).toEqual(["cold brew coffee maker", "leather wallet"]);
    expect(splitPhrases(["a ", "", "b"])).toEqual(["a", "b"]);
    expect(splitPhrases(undefined)).toEqual([]);
  });

  it("turns only the inputs declared as lists", () => {
    const declared = [
      { name: "keywords", jsonSchema: { type: "array" } },
      { name: "country", jsonSchema: { type: "string" } },
    ];
    expect(withLists(declared, { keywords: "a\nb", country: "US" })).toEqual({ keywords: ["a", "b"], country: "US" });
  });
});
