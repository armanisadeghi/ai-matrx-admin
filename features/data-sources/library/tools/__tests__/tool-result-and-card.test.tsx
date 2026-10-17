/**
 * The Tools home states a person can reach (L7): a settled answer shows its kind, its cost in points
 * and no vendor name; an empty answer says nothing was charged; a refusal says it in our words; a
 * running call shows the stage; a card shows price, reliability with its sample size and speed.
 */
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { CatalogToolHit, ToolCallView } from "@ai-matrx/agents/tools";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let seesDollars = false;
jest.mock("@/components/cost/useCostDisplay", () => ({ useSeesDollars: () => seesDollars }));
jest.mock("@/components/cost/formatAdminCost", () => ({ formatAdminUsd: (n: number) => `$${n.toFixed(2)}` }));
jest.mock("@/components/errors/ErrorAlchemyMenu", () => ({ ErrorAlchemyMenu: () => <i data-alchemy="" /> }));
jest.mock("@/components/official/structured-value/AnswerValueView", () => ({
  AnswerValueView: ({ value }: { value: { domain?: string } }) => <div data-answer="">{value?.domain}</div>,
}));
jest.mock("@ai-matrx/chat/tool-call-visualization/result-fields/ResultJson", () => ({
  ResultJson: ({ data }: { data: unknown }) => <pre data-raw="">{JSON.stringify(data)}</pre>,
}));
jest.mock("@/features/tool-result-tables/ToolResultTableBar", () => ({ ToolResultTableBar: () => <div data-table-bar="" /> }));
jest.mock("@/components/icons/domain-icons", () => ({ AGENT_ICON: () => <svg /> }));

import { ToolResult } from "../ToolResult";
import { ToolCard } from "../ToolCard";

const view = (status: ToolCallView["status"], extra: Partial<ToolCallView> = {}): ToolCallView => ({
  call_id: "c1",
  tool_id: "t1",
  tool_name: "seo_backlinks_summary",
  display_name: "Backlinks",
  status,
  stage: null,
  stage_label: null,
  output: null,
  display_source: null,
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
  ...extra,
});

let root: Root;
let host: HTMLDivElement;
const noop = () => {};
const show = (v: ToolCallView | null, clientError: string | null = null) =>
  act(() => root.render(<ToolResult view={v} clientError={clientError} onRunAgain={noop} onCancel={noop} onReopen={noop} />));
beforeEach(() => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  seesDollars = false;
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("ToolResult", () => {
  it("shows the answer with its cost in points, and never the vendor cost to a member", () => {
    show(view("succeeded", { output: { domain: "example.org" }, points_charged: 481, cost_usd: 0.02, raw: { domain: "example.org" } }));
    expect(host.querySelector("[data-answer]")?.textContent).toBe("example.org");
    const cost = host.querySelector("[data-tool-cost]")?.textContent ?? "";
    expect(cost).toContain("Cost");
    expect(cost).not.toContain("$");
    expect(host.textContent).toContain("Raw data");
  });

  it("a seat that may see dollars sees the vendor cost; a single-answer Tool (no source from the layer) names none", () => {
    seesDollars = true;
    show(view("succeeded", { output: { domain: "x.org" }, points_charged: 10, cost_usd: 0.02, display_source: null }));
    const cost = host.querySelector("[data-tool-cost]")?.textContent ?? "";
    expect(cost).toContain("$0.02");
    expect(cost).not.toContain("Matrx");
  });

  it("a compare Tool's source (what the layer sends only for compare) is shown beside the answer", () => {
    show(view("succeeded", { output: { domain: "x.org" }, display_source: "Moz" }));
    expect(host.querySelector("[data-tool-cost]")?.textContent).toContain("Moz");
  });

  it("says a saved answer is saved, and free when nothing was charged", () => {
    show(view("succeeded", { output: { domain: "x.org" }, points_charged: 0, cache: "own" }));
    const cost = host.querySelector("[data-tool-cost]")?.textContent ?? "";
    expect(cost).toContain("Saved answer");
    expect(cost).toContain("No charge");
  });

  it("an empty answer promises no charge; a refusal carries our sentence and the copy menu", () => {
    show(view("empty"));
    expect(host.textContent).toContain("You weren't charged.");
    show(view("failed", { error: { code: "all_sources_failed", message: "No source could answer Backlinks right now." } }));
    expect(host.textContent).toContain("No source could answer Backlinks right now.");
    expect(host.querySelector("[data-alchemy]")).toBeTruthy();
  });

  it("a running call shows its stage and the points held", () => {
    show(view("waiting", { stage_label: "Waiting on source", points_held: 400 }));
    expect(host.querySelector("[data-tool-result='running']")?.textContent).toContain("Waiting on source");
    expect(host.textContent).toContain("held");
  });

  it("a finishing call offers no Stop, and a call that cannot be read says it is saved and can be reopened", () => {
    show(view("running", { stage: "done", stage_label: "Done" }));
    expect([...host.querySelectorAll("button")].some((b) => b.textContent === "Stop")).toBe(false);
    show(view("running", { stage: "fetching", stage_label: "Fetching" }));
    expect([...host.querySelectorAll("button")].some((b) => b.textContent === "Stop")).toBe(true);
    show(view("running"), "Your answer is saved. Reopen it to see it.");
    expect(host.querySelector("[data-tool-result='lost-touch']")).toBeTruthy();
    expect([...host.querySelectorAll("button")].some((b) => b.textContent === "Reopen it")).toBe(true);
  });

  it("the raw view is a marked source view, so internal keys are allowed there and nowhere else", () => {
    show(view("succeeded", { output: { domain: "x.org" }, raw: { __kind: "domain_authority", domain: "x.org" } }));
    act(() => ([...host.querySelectorAll("button")].find((b) => b.textContent === "Raw data") as HTMLButtonElement).click());
    expect(host.querySelector("[data-kind-source='explicit'] [data-raw]")).toBeTruthy();
  });

  it("nothing sent yet is a quiet placeholder; a call that never reached the server says so", () => {
    show(null);
    expect(host.querySelector("[data-tool-result='idle']")).toBeTruthy();
    show(null, "The Tool could not be reached. Nothing was charged.");
    expect(host.textContent).toContain("Nothing was charged.");
  });
});

const hit = (extra: Partial<CatalogToolHit> = {}): CatalogToolHit => ({
  tool_id: "t1",
  job_key: "seo_backlinks_summary",
  display_name: "Backlinks",
  display_noun: "Report",
  summary: "How many links point at a site.",
  job_family: "seo",
  price_hint_points: 400,
  reliability: { success_rate: 1, samples: 6, p50_ms: 4300, last_success_at: null },
  state: "live",
  ...extra,
});

describe("ToolCard", () => {
  it("states price, reliability with its sample and speed; try and give are separate presses", () => {
    const opened = jest.fn();
    const gave = jest.fn();
    act(() => root.render(<ToolCard hit={hit()} onOpen={opened} onGive={gave} />));
    const text = host.textContent ?? "";
    expect(text).toContain("400 pts");
    expect(text).toContain("100% worked");
    expect(text).toContain("6 runs");
    expect(text).toContain("~4.3 s");
    const buttons = [...host.querySelectorAll("button")];
    act(() => buttons.find((b) => b.textContent === "Give to an agent")!.click());
    expect(gave).toHaveBeenCalledTimes(1);
    expect(opened).not.toHaveBeenCalled();
    act(() => buttons.find((b) => b.textContent === "Try it")!.click());
    expect(opened).toHaveBeenCalledTimes(1);
  });

  it("is honest while the sample is small and when the Tool is paused", () => {
    act(() => root.render(<ToolCard hit={hit({ reliability: { success_rate: 1, samples: 2, p50_ms: null, last_success_at: null }, state: "paused" })} onOpen={noop} onGive={noop} />));
    const text = host.textContent ?? "";
    expect(text).toContain("New");
    expect(text).not.toContain("100% worked");
    expect(text).toContain("Paused");
  });
});
