import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { parseResult, type ComparisonResult } from "../contract";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/components/agent-copy/CopyButtons", () => ({ CopyButtons: () => null }));
jest.mock("next/image", () => ({ __esModule: true, default: () => null }));

import { ComparisonView } from "../components/ComparisonView";
import type { FacetConfirm } from "../components/ConfirmFacetLine";

const F = (key: string, label: string, extra = {}) =>
  ({ key, label, type: "rating", direction: "higher_better", is_primary: false, help: "", ...extra });
const V = (value: unknown, display: string, best = false) => ({ value, display, is_best: best, basis: "" });

function make(facet: Record<string, unknown>): ComparisonResult {
  return parseResult({
    kind: "companies_reviews", kind_label: "Companies", primary_field: "rating",
    fields: [F("rating", "Rating", { is_primary: true }),
      F("employee_rating", "Employee rating", { facet: "jobs", facet_label: "Open jobs" })],
    items: ["Alpha", "Beta"].map((n, i) => ({
      item_id: n, item_index: i, name: n, rank: i + 1,
      values: { rating: V(4 - i, String(4 - i), i === 0), employee_rating: i === 0 ? V(null, "—") : V(3.5, "3.5", true) },
      facets: [i === 0 ? { key: "jobs", label: "Open jobs", status: "failed", error: "x", ...facet }
        : { key: "jobs", label: "Open jobs", status: "done" }],
    })),
  }) as ComparisonResult;
}

async function render(r: ComparisonResult, confirm?: FacetConfirm) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  await act(async () => {
    createRoot(host).render(
      <QueryClientProvider client={new QueryClient()}><ComparisonView result={r} onConfirm={confirm} /></QueryClientProvider>);
  });
  await act(async () => { await new Promise((r) => setTimeout(r, 0)); });  // the price query settles
  return host;
}

const button = (host: HTMLElement, label: string) =>
  [...host.querySelectorAll("button")].find((b) => b.textContent?.includes(label)) as HTMLButtonElement | undefined;

afterEach(() => { document.body.innerHTML = ""; });

describe("Is this them?", () => {
  const possible = { possible_url: "https://www.indeed.com/cmp/Alpha-Classifieds", possible_name: "Alpha Classifieds" };

  it("one compact line with the page in a new tab, the cost behind a door, and a way out", async () => {
    const confirm: FacetConfirm = { runId: "r1", price: jest.fn().mockResolvedValue(30), answer: jest.fn().mockResolvedValue(undefined) };
    const host = await render(make(possible), confirm);
    const line = host.querySelector('[data-testid="confirm-facet-line"]') as HTMLElement;
    expect(line.textContent).toContain("Is this them?");
    const link = line.querySelector("a") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe(possible.possible_url);
    expect(link.textContent).toContain("Alpha Classifieds");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(button(host, "Yes, use it")?.textContent).not.toMatch(/30|point/i);        // the price is not on the button
    expect(host.textContent).not.toMatch(/30 points/);                              // it sits behind the Cost door
    expect(button(host, "Not them")).toBeDefined();
    await act(async () => { button(host, "Not them")!.click(); });
    expect(confirm.answer).toHaveBeenCalledWith(expect.objectContaining({ item_id: "Alpha" }), "jobs", { reject: true });
    document.body.innerHTML = "";
    const again = await render(make(possible), confirm);
    await act(async () => { button(again, "Yes, use it")!.click(); });
    expect(confirm.answer).toHaveBeenCalledWith(expect.objectContaining({ item_id: "Alpha" }), "jobs", { url: possible.possible_url });
  });

  it("is read-only without a handler (a public page): the question and the link, no buttons", async () => {
    const host = await render(make(possible));
    expect(host.querySelector('[data-testid="confirm-facet-line"]')).not.toBeNull();
    expect(button(host, "Yes, use it")).toBeUndefined();
  });

  it("after Not them it reads Not found, with no question", async () => {
    const host = await render(make({ ...possible, rejected: true, possible_url: null, possible_name: null }));
    expect(host.querySelector('[data-testid="confirm-facet-line"]')).toBeNull();
    expect(host.textContent).toContain("Not found for Alpha");
  });
});

describe("who may answer", () => {
  it("the run state carries can_confirm; only true offers the buttons", () => {
    const { parseRunState } = jest.requireActual("../contract") as typeof import("../contract");
    expect(parseRunState({ run_id: "r", status: "done", can_confirm: true })?.can_confirm).toBe(true);
    expect(parseRunState({ run_id: "r", status: "done" })?.can_confirm).toBe(false);
  });
});
