import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ResultGrid } from "../components/ResultGrid";
import { CoveragePanel } from "../components/CoveragePanel";
import type { BattleView, CellView, LaneRollup } from "../types";

const rollup = (over: Partial<LaneRollup>): LaneRollup => ({
  cells: 2, succeeded: 2, empty: 0, failed: 0, refused: 0, cancelled: 0, success_rate: 1, hit_rate: 1,
  p50_ms: 400, p95_ms: 500, p50_ok_ms: 400, cost_usd: 0.003, points: 60, cost_per_success_usd: 0.0015,
  points_per_success: 30, mean_filled_fields: 3, ...over,
});

const battle = (blind: boolean): BattleView => ({
  id: "b", title: "Social profile", jobKey: "social_profile", toolId: "t", status: "completed", blind,
  blindOrder: ["L2", "L1"], leaseSeconds: 90, promotions: [], createdAt: "2026-10-16T10:00:00Z", startedAt: null, finishedAt: null,
  lanes: [
    { lane_id: "L1", endpoint_id: "e1", label: "ScrapeCreators", provider_slug: "scrapecreators", via: "direct" },
    { lane_id: "L2", endpoint_id: "e2", label: "Scraper dataset", provider_slug: "bright_data", via: "direct" },
  ],
  subjects: [
    { subject_id: "S1", label: "acme.co", inputs: { url: "acme.co" }, pool_id: null },
    { subject_id: "S2", label: "beta.io", inputs: { url: "beta.io" }, pool_id: null },
  ],
  summary: {
    lanes: { L1: rollup({}), L2: rollup({ success_rate: 0.5, succeeded: 1, failed: 1, p50_ms: 31000, p95_ms: 31000, cost_per_success_usd: 0.015, mean_filled_fields: 1 }) },
    ranking: ["L1", "L2"],
    coverage: [{ path: "followers", rates: { L1: 1, L2: 0 }, only_in: "L1", missing_in: ["L2"] }],
    subjects: 2,
  },
});

const cell = (laneId: string, subjectId: string, over: Partial<CellView> = {}): CellView => ({
  id: `${laneId}${subjectId}`, laneId, subjectId, status: "succeeded", heartbeatAt: null, callId: "c1", providerSlug: null, via: null,
  wallMs: 410, vendorMs: 380, costUsd: 0.0015, points: 30, errorCode: null, errorMessage: null, output: { a: 1 },
  answerFields: [{ path: "followers", filled: true, type: "number", sample: "12" }], rawFields: [], ignoredFilters: [],
  evidence: { verified: true, clean: true, problems: [], attempts: 1 }, ...over,
});

const cells: CellView[] = [
  cell("L1", "S1"), cell("L1", "S2"), cell("L2", "S1"),
  cell("L2", "S2", { status: "failed", errorCode: "timed_out", errorMessage: "The source did not answer in time.", wallMs: 31000, answerFields: [] }),
];

describe("ResultGrid", () => {
  it("names each source, shows the numbers and the failed cell's reason", () => {
    const b = battle(false);
    const html = renderToStaticMarkup(<ResultGrid battle={b} cells={cells} lanes={b.lanes} revealed={false} />);
    expect(html).toContain("ScrapeCreators");
    expect(html).toContain("Scraper dataset");
    expect(html).toContain("50%");
    expect(html).toContain("timed out");
    expect(html).toContain("31 s");
  });

  it("hides names and cost while blind, then shows them on reveal", () => {
    const b = battle(true);
    const lanes = [b.lanes[1], b.lanes[0]];
    const hidden = renderToStaticMarkup(<ResultGrid battle={b} cells={cells} lanes={lanes} revealed={false} />);
    expect(hidden).toContain("Source A");
    expect(hidden).not.toContain("ScrapeCreators");
    expect(hidden).not.toContain("Scraper dataset");
    expect(hidden).not.toContain("$0.0015");
    const shown = renderToStaticMarkup(<ResultGrid battle={b} cells={cells} lanes={b.lanes} revealed />);
    expect(shown).toContain("ScrapeCreators");
  });
});

describe("CoveragePanel", () => {
  it("lists a field the sources disagree on", () => {
    const b = battle(false);
    const html = renderToStaticMarkup(<CoveragePanel battle={b} lanes={b.lanes} revealed={false} />);
    expect(html).toContain("followers");
    expect(html).toContain("100%");
    expect(html).toContain("0%");
  });
});
