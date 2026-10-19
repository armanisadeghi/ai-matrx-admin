/**
 * The Overview, through the real `useToolCall` (only the HTTP runner is faked):
 *  - nothing is bought until the press, and no price is shown;
 *  - the press runs the three Tools as durable calls for the typed website, and the answers sit side by
 *    side — Moz named for its own score, "Matrx" for ours, SpyFu for its own;
 *  - "See the links" runs the list Tool and only then.
 */
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { CatalogToolHit, ToolCallView } from "@ai-matrx/agents/tools";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const replaced: string[] = [];
jest.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams("d=smitten.example") }));
jest.mock("@/lib/url-state/addressWithoutNavigating", () => ({ replaceAddressWithoutNavigating: (u: string) => replaced.push(u) }));
jest.mock("@/features/data-sources/library/tools/ToolResult", () => ({
  ToolResult: ({ view }: { view: { display_name?: string; points_charged: number } | null }) => (
    <div data-testid="result">{view ? `${view.display_name} answered for ${view.points_charged}` : "none"}</div>
  ),
}));
jest.mock("@ai-matrx/chat/action-requests/hooks/useToolAction", () => ({ ToolActionApprovalDialog: () => null }));

const runHostToolCall = jest.fn();
jest.mock("@ai-matrx/chat/agents/identity/tool-calls", () => ({
  runHostToolCall: (...a: unknown[]) => runHostToolCall(...a),
  resumeHostToolCall: jest.fn(),
  cancelHostToolCall: jest.fn(),
}));

import { WebsiteCheck } from "../WebsiteCheck";
import type { SeoTools } from "../seoTools";

const hit = (job_key: string, price: number): CatalogToolHit => ({
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
const TOOLS: SeoTools = {
  authority: hit("seo_domain_authority", 134),
  authorityScore: { ...hit("seo_authority_score", 50), compare_sources: [{ endpoint_id: "e1", display_source: "Moz" }, { endpoint_id: null, display_source: "Matrx" }] } as CatalogToolHit,
  links: hit("seo_backlinks_summary", 482),
  searchAds: hit("seo_search_ads_overview", 20),
  linkRows: hit("seo_backlink_rows", 400),
};
const OUTPUT: Record<string, { output: unknown; points: number }> = {
  "id-seo_domain_authority": { output: { __kind: "domain_authority", domain_authority: 31 }, points: 134 },
  "id-seo_authority_score": { output: { __kind: "authority_score", score: 46 }, points: 50 },
  "id-seo_backlinks_summary": { output: { __kind: "backlinks_summary", backlinks: 1710 }, points: 481 },
  "id-seo_search_ads_overview": { output: { __kind: "search_ads_overview", site_strength: 49 }, points: 20 },
  "id-seo_backlink_rows": { output: { __kind: "backlink_rows", items: [] }, points: 400 },
};
const viewFor = (toolId: string): ToolCallView => ({
  call_id: `call-${toolId}`,
  tool_id: toolId,
  tool_name: null,
  display_name: toolId,
  status: "succeeded",
  stage: null,
  stage_label: null,
  output: OUTPUT[toolId].output,
  display_source: "Matrx",
  ignored_filters: [],
  points_held: 0,
  points_charged: OUTPUT[toolId].points,
  cache: "none",
  error: null,
  approval: null,
  raw: null,
  created_at: null,
  finished_at: null,
  latency_ms: 800,
});

let host: HTMLElement;
let root: Root;
beforeEach(() => {
  runHostToolCall.mockReset();
  replaced.length = 0;
  runHostToolCall.mockImplementation(async ({ request, onUpdate }: { request: { tool_id: string }; onUpdate?: (v: ToolCallView) => void }) => {
    const done = viewFor(request.tool_id);
    onUpdate?.(done);
    return done;
  });
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const text = () => host.textContent ?? "";
const button = (label: string) => [...host.querySelectorAll("button")].find((b) => (b.textContent ?? "").includes(label));

it("buys nothing before the press and shows no price", async () => {
  await act(async () => root.render(<WebsiteCheck host="smitten.example" tools={TOOLS} />));
  expect(runHostToolCall).not.toHaveBeenCalled();
  expect(button("Check website")?.textContent).toBe("Check website");
  expect(text()).not.toMatch(/points|pts|No charge/);
});

it("runs the three Tools for the typed website and shows their scores side by side", async () => {
  await act(async () => root.render(<WebsiteCheck host="smitten.example" tools={TOOLS} />));
  await act(async () => button("Check website")!.click());

  const sent = runHostToolCall.mock.calls.map((c) => (c[0] as { request: { tool_id: string; inputs: unknown; cache_policy: string } }).request);
  expect(sent.map((r) => r.tool_id).sort()).toEqual([
    "id-seo_authority_score",
    "id-seo_backlinks_summary",
    "id-seo_domain_authority",
    "id-seo_search_ads_overview",
  ]);
  expect(sent.every((r) => JSON.stringify(r.inputs) === JSON.stringify({ domain: "smitten.example" }))).toBe(true);
  expect(sent.every((r) => r.cache_policy === "prefer")).toBe(true);

  const tiles = [...host.querySelectorAll("[data-authority-tile]")].map((t) => t.textContent);
  expect(tiles[0]).toContain("Moz");
  expect(tiles[0]).toContain("31");
  expect(tiles[1]).toContain("Matrx");
  expect(tiles[1]).toContain("46");
  expect(tiles[2]).toContain("SpyFu");
  expect(tiles[2]).toContain("49");
  expect(host.querySelector("[data-check-spent]")).toBeNull();
  expect(replaced.some((u) => u.includes("ca=call-id-seo_domain_authority"))).toBe(true);
});

it("lists the links only when asked", async () => {
  await act(async () => root.render(<WebsiteCheck host="smitten.example" tools={TOOLS} />));
  expect(button("See the links")?.textContent).toBe("See the links");
  await act(async () => button("See the links")!.click());
  expect(runHostToolCall).toHaveBeenCalledTimes(1);
  expect((runHostToolCall.mock.calls[0][0] as { request: { tool_id: string } }).request.tool_id).toBe("id-seo_backlink_rows");
});

it("never prints a vendor that is not a leader", async () => {
  await act(async () => root.render(<WebsiteCheck host="smitten.example" tools={TOOLS} />));
  await act(async () => button("Check website")!.click());
  expect(text()).not.toMatch(/dataforseo|serpstat|treg|seranking/i);
});

it("until the server says the authority score has compare sources, the Matrx tile is the link strength already bought — never a second Moz", async () => {
  const before: SeoTools = { ...TOOLS, authorityScore: hit("seo_authority_score", 50) };
  await act(async () => root.render(<WebsiteCheck host="smitten.example" tools={before} />));
  await act(async () => button("Check website")!.click());
  const ids = runHostToolCall.mock.calls.map((c) => (c[0] as { request: { tool_id: string } }).request.tool_id);
  expect(ids).not.toContain("id-seo_authority_score");
  expect(ids).toHaveLength(3);
  const tiles = [...host.querySelectorAll("[data-authority-tile]")].map((t) => t.textContent ?? "");
  expect(tiles[1]).toContain("Link strength");
  expect(tiles[1]).toContain("Matrx");
});
