/**
 * THE FLOWS CONTRACT (owner, 2026-10-21): every grid tile has a flow, every flow is a tile (or
 * named as living outside the grid), and the playground's Flow view and Big picture render for
 * all of them from the data alone.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PRODUCTS, PRODUCT_FAMILIES } from "../products";
import { FLOWS, FLOWS_OUTSIDE_THE_GRID, INTELLIGENCE_PARTS, flowCounts, flowForTile } from "../flows";
import { BigPicture, FlowView } from "@/app/(lab)/lab/shell/FlowView";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLElement;
let root: Root;
function render(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(node));
}
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

describe("flows and tiles match", () => {
  it("every tile has a flow", () => {
    const missing = PRODUCTS.filter((p) => !flowForTile(p.name)).map((p) => p.name);
    expect(missing).toEqual([]);
  });

  it("every flow is a tile, part of Intelligence, or named as outside the grid", () => {
    const tileFlows = new Set(PRODUCTS.map((p) => flowForTile(p.name)?.product));
    const orphans = FLOWS.map((f) => f.product).filter(
      (name) =>
        !tileFlows.has(name) &&
        !(INTELLIGENCE_PARTS as readonly string[]).includes(name) &&
        !(name in FLOWS_OUTSIDE_THE_GRID),
    );
    expect(orphans).toEqual([]);
  });

  it("Intelligence holds its six parts' sections", () => {
    const intelligence = flowForTile("Intelligence")!;
    const parts = INTELLIGENCE_PARTS.map((n) => FLOWS.find((f) => f.product === n)!);
    expect(intelligence.sections).toHaveLength(parts.reduce((n, p) => n + p.sections.length, 0));
  });
});

describe("the Flow view renders for every tile", () => {
  it.each(PRODUCTS.map((p) => [p.name] as const))("%s", (name) => {
    const flow = flowForTile(name)!;
    render(<FlowView flow={flow} focusSection={null} />);
    const view = host.querySelector('[data-testid="flow-view"]')!;
    expect(view).not.toBeNull();
    // One Map card per section, and the header counts what the data says.
    expect(view.querySelectorAll("section[id^='flow-section-']")).toHaveLength(flow.sections.length);
    expect(view.textContent).toContain(String(flowCounts(flow).pages));
  });

  it("the Big picture shows every family and tile, and what lives outside the grid", () => {
    render(<BigPicture products={PRODUCTS} families={PRODUCT_FAMILIES} onPick={() => {}} />);
    const view = host.querySelector('[data-testid="big-picture"]')!;
    for (const f of PRODUCT_FAMILIES) expect(view.querySelector(`section[aria-label="${f.label}"]`)).not.toBeNull();
    for (const p of PRODUCTS) expect(view.textContent).toContain(p.name);
    for (const name of Object.keys(FLOWS_OUTSIDE_THE_GRID)) expect(view.textContent).toContain(name);
  });
});
