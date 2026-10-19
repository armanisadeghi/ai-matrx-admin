/**
 * @jest-environment jsdom
 */
// A LOADING DATABASE BLOCK IS THE LIVE FRAME (lane DB-BLOCK-CHROME, 2026-10-19).
//
// Slow-4G probes (SPACES-SHIFT-3) saw blocks under a database block jump ~250 px at 375 px wide when the block
// mounted its frame: the loading box was a bare box sized by a pixel formula (one 32 px bar, 26 px padding),
// while the live frame's bar wraps onto two lines in a narrow block and its toolbar buttons, view tabs and
// grid header only appeared at mount. At 768 px the page's columns were laid out side by side by the server
// and stacked by a ResizeObserver after hydration. Now: the loading block draws the live frame's own
// elements and controls for the person's role, from the ONE decision the live frame also uses, and the
// columns stack by a container query. Fails on the old code (bare `.spaces-db-loading` box; data-narrow JS).

// A view's own icon (SpaceIcon) reads the media library; the frame's geometry does not depend on which glyph.
jest.mock("../../page/SpaceIcon", () => ({ SpaceIcon: () => null }));

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { DatabaseLoadingBox } from "../../editor/database-loading-box";
import { StructureProvider } from "../../page/structure";
import { frameControls } from "../database-frame-shape";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let mount: HTMLDivElement | null = null;
afterEach(() => {
  if (root) act(() => root!.unmount());
  root = null;
  mount?.remove();
  mount = null;
});
const render = (node: React.ReactNode) => {
  mount = document.createElement("div");
  document.body.appendChild(mount);
  root = createRoot(mount);
  act(() => root!.render(node));
  return mount;
};

const block = (extra: Record<string, unknown> = {}) => ({
  source: { kind: "table", tableId: "t1" },
  title: "Investors",
  views: [
    { id: "a", name: "All investors", layout: "grid" },
    { id: "b", name: "By stage", layout: "kanban" },
  ],
  activeViewId: "a",
  ...extra,
});

const labels = (el: Element | null) => [...(el?.querySelectorAll("[aria-label]") ?? [])].map((b) => b.getAttribute("aria-label"));

describe("frameControls — the one decision both frames draw from", () => {
  it("a reader gets filter, sort, search, full page and New; no structure controls", () => {
    expect(frameControls(false, { shape: false, published: false })).toEqual({ tabs: [], tools: ["filter", "sort", "search", "maximize", "new"] });
  });
  it("a Full access editor adds the view, automations and view settings in their own slots", () => {
    expect(frameControls(false, { shape: true, published: false })).toEqual({ tabs: ["addView"], tools: ["filter", "sort", "automations", "search", "maximize", "settings", "new"] });
  });
  it("a published page has no automations and no New", () => {
    expect(frameControls(false, { shape: false, published: true }).tools).toEqual(["filter", "sort", "search", "maximize"]);
  });
  it("a chart keeps its tools beside its title and has no toolbar row", () => {
    expect(frameControls(true, { shape: true, published: false })).toEqual({ tabs: ["settings", "chartTools"], tools: null });
  });
});

describe("DatabaseLoadingBox draws the frame", () => {
  it("draws the frame, title, every stored view tab by name, the toolbar and the grid body", () => {
    const el = render(<DatabaseLoadingBox blockId="b1" p={block()} />);
    const frame = el.querySelector(".spaces-db-frame");
    expect(frame?.getAttribute("data-layout")).toBe("grid");
    expect(frame?.querySelector(".spaces-db-title")?.textContent).toBe("Investors");
    const tabs = [...(frame?.querySelectorAll(".spaces-db-tabs [role=tab]") ?? [])].map((t) => t.textContent);
    expect(tabs).toEqual(["All investors", "By stage"]);
    expect(frame?.querySelector(".spaces-db-tabs .spaces-view-pill")?.textContent).toBe("All investors");
    expect(labels(frame?.querySelector(".spaces-db-tools") ?? null)).toEqual(["Filter", "Sort", "Search", "Open as full page", "Templates"]);
    expect(frame?.querySelector(".spaces-db-tools .spaces-db-new")?.textContent).toContain("New");
    expect(frame?.querySelector(".spaces-db-body")).not.toBeNull();
    expect(el.querySelector(":scope > .spaces-db-loading")).toBeNull();
  });
  it("an editor with Full access on an editable page holds the structure controls from the first paint", () => {
    const el = render(
      <StructureProvider value>
        <DatabaseLoadingBox blockId="b1" p={block()} editable />
      </StructureProvider>,
    );
    expect(labels(el.querySelector(".spaces-db-tools"))).toEqual(["Filter", "Sort", "Automations", "Search", "Open as full page", "View settings", "Templates"]);
    expect(labels(el.querySelector(".spaces-db-tabs"))).toContain("Add view");
  });
  it("a content editor (no structure) draws the reader's controls, like the live frame", () => {
    const el = render(
      <StructureProvider value={false}>
        <DatabaseLoadingBox blockId="b1" p={block()} editable />
      </StructureProvider>,
    );
    expect(labels(el.querySelector(".spaces-db-tools"))).toEqual(["Filter", "Sort", "Search", "Open as full page", "Templates"]);
  });
  it("a chart draws its pill title and no toolbar row; a hidden title draws no title row", () => {
    const chart = render(<DatabaseLoadingBox blockId="c1" p={block({ views: [{ id: "c", name: "Raised", layout: "chart" }], activeViewId: "c" })} />);
    expect(chart.querySelector(".spaces-db-frame[data-layout=chart] .spaces-chart-title")?.textContent).toBe("Raised");
    expect(chart.querySelector(".spaces-db-tools")).toBeNull();
    act(() => root!.unmount());
    root = null;
    const untitled = render(<DatabaseLoadingBox blockId="b1" p={block({ showTitle: false })} />);
    expect(untitled.querySelector(".spaces-db-title")).toBeNull();
  });
  it("the live frame gates every one of those controls through frameControls", () => {
    const src = readFileSync(join(__dirname, "../DatabaseBlock.tsx"), "utf8");
    for (const gate of ['tabControl("settings")', 'tabControl("chartTools")', 'tabControl("addView")', 'tool("automations")', 'tool("settings")', 'tool("new")', "controls.tools ?"]) expect(src).toContain(gate);
  });
});

describe("columns stack by the content's own width in CSS, never after hydration", () => {
  it("spaces.css stacks columns in a container query and SpacePage sets no data-narrow", () => {
    const css = readFileSync(join(__dirname, "../../spaces.css"), "utf8");
    const page = readFileSync(join(__dirname, "../../page/SpacePage.tsx"), "utf8");
    expect(css).toMatch(/\.spaces-content\s*\{\s*container:\s*spaces-content\s*\/\s*inline-size;/);
    expect(css).toMatch(/@container spaces-content \(max-width: 367\.98px\)/);
    expect(css).not.toMatch(/\[data-narrow/);
    expect(page).not.toMatch(/data-narrow/);
  });
});
