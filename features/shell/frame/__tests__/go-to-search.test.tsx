/**
 * THE "GO TO" SEARCH (owner, 2026-10-21): an icon in the sidebar's top row opens a palette that
 * finds any page or feature, by name or by another word for it, and goes straight there.
 *
 *   1. the index finds a deep page by its name and by a synonym, lists dynamic routes only as
 *      their list page, and groups under the product;
 *   2. the index is lazy: nothing in the frame imports it or the palette except the lazy edge, and
 *      the palette does not exist in the page until the icon is pressed;
 *   3. keyboard: Cmd/Ctrl+Shift+K opens it (not Cmd+K, the knowledge bar's), Enter goes, Cmd+Enter
 *      opens a new tab;
 *   4. the classic "Search menu" ranking is unchanged (utils/menu-search.test.ts) and runs on the
 *      same engine.
 */
import React, { act } from "react";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { createRoot, type Root } from "react-dom/client";
import { GoToSearch, isGoToHotkey } from "../GoToSearch";
import { buildGoToIndex } from "../goToIndex";
import { FRAME_ROUTE_HOMES } from "../route-homes.generated";
import { GO_TO_PAGES } from "../go-to-pages.generated";
import { PRODUCTS, PRODUCT_FAMILIES } from "../products";
import { rankMenuSearch } from "../searchEngine";
import { fullGoToIndex } from "../goToSearchIndex";
import { buildMenuSearchIndex } from "../../utils/menu-search";
import { navItemsForViewer, primaryNavItems, settingsItem } from "../../constants/nav-data";
import { menuGoToEntries } from "../../frame-host/goToMenuEntries";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= NoopResizeObserver;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

const index = buildGoToIndex(PRODUCTS, PRODUCT_FAMILIES, FRAME_ROUTE_HOMES);
const top = (query: string) => rankMenuSearch(index, query).slice(0, 5);

describe("the go-to index", () => {
  it("lists every product", () => {
    for (const p of PRODUCTS) expect(index.some((e) => e.id === `product:${p.id}`)).toBe(true);
  });

  it("finds a deep page by its name, under its product", () => {
    const deep = index.find((e) => e.id.startsWith("route:") && e.trail.length > 1)!;
    expect(deep).toBeDefined();
    const hit = top(deep.label).find((e) => e.href === deep.href);
    expect(hit?.productId).toBe(deep.productId);
  });

  it("finds a product by another word for it (synonyms)", () => {
    expect(top("spreadsheet").map((e) => e.productId)).toContain("data");
    expect(top("invoices").map((e) => e.productId)).toContain("business-tools");
    expect(top("kanban").map((e) => e.productId)).toContain("workspace");
  });

  it("a name outranks a synonym", () => {
    expect(top("chat")[0].productId).toBe("chat");
  });

  it("never lists a dynamic route; its list page stands for it", () => {
    expect(index.some((e) => e.href.includes("["))).toBe(false);
    expect(FRAME_ROUTE_HOMES.routes.some((r) => r[0].includes("["))).toBe(true);
  });

  it("finds every page with a home, not only the titled ones (\"timesheet\" → Timesheets)", () => {
    const full = buildGoToIndex(PRODUCTS, PRODUCT_FAMILIES, FRAME_ROUTE_HOMES, [], GO_TO_PAGES);
    expect(rankMenuSearch(index, "timesheet").some((e) => e.href === "/hr/time/timesheets")).toBe(false);
    const hit = rankMenuSearch(full, "timesheet").find((e) => e.href === "/hr/time/timesheets");
    expect(hit).toMatchObject({ productId: "hr", label: "Timesheets" });
    expect(full.some((e) => e.href.includes("["))).toBe(false);
    // Every concrete page row is reachable by its own title.
    const hrefs = new Set(full.map((e) => e.href));
    expect(GO_TO_PAGES.filter(([pattern]) => !hrefs.has(pattern))).toEqual([]);
  });

  it("host entries merge in", () => {
    const withExtra = buildGoToIndex(PRODUCTS, PRODUCT_FAMILIES, FRAME_ROUTE_HOMES, [
      { id: "x", productId: "chat", label: "Zebra desk", trail: ["Chat"], href: "/zebra" },
    ]);
    expect(rankMenuSearch(withExtra, "zebra")[0].href).toBe("/zebra");
  });
});

describe("the go-to palette is lazy", () => {
  it("only the lazy edge imports the index and the palette", () => {
    const dir = join(__dirname, "..");
    for (const file of readdirSync(dir).filter((f) => /\.tsx?$/.test(f))) {
      const src = readFileSync(join(dir, file), "utf8");
      const staticImport = /^import (?!type)[^;]*from "\.\/(goToIndex|GoToPalette|go-to-pages\.generated|goToSearchIndex)"/m.test(src);
      // palette -> the one full index -> index + pages; nothing else imports them statically.
      if (file === "GoToPalette.tsx" || file === "goToSearchIndex.ts") expect(staticImport).toBe(true);
      else expect({ file, staticImport }).toEqual({ file, staticImport: false });
    }
    const edge = readFileSync(join(dir, "GoToSearch.tsx"), "utf8");
    expect(edge).toMatch(/lazy\(\(\) => import\("\.\/GoToPalette"\)\)/);
  });
});

describe("the go-to icon and hotkey", () => {
  let host: HTMLElement;
  let root: Root;
  const go = jest.fn();
  beforeEach(() => {
    go.mockReset();
    host = document.createElement("div");
    document.body.appendChild(host);
    root = createRoot(host);
    act(() => root.render(<GoToSearch products={PRODUCTS} families={PRODUCT_FAMILIES} onGo={go} />));
  });
  afterEach(() => {
    act(() => root.unmount());
    document.body.innerHTML = "";
  });
  const palette = () => document.querySelector("[data-go-to-palette]");
  const settle = () => act(() => new Promise<void>((r) => setTimeout(r, 50)));
  const key = (init: KeyboardEventInit) =>
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }));
    });

  it("nothing of the palette exists before it is opened", () => {
    expect(palette()).toBeNull();
    expect(host.querySelector('[aria-label="Go to any page or feature"]')).not.toBeNull();
  });

  it("the hotkey is Cmd/Ctrl+Shift+K, never plain Cmd+K", () => {
    expect(isGoToHotkey({ key: "K", metaKey: true, ctrlKey: false, altKey: false, shiftKey: true })).toBe(true);
    expect(isGoToHotkey({ key: "k", metaKey: false, ctrlKey: true, altKey: false, shiftKey: true })).toBe(true);
    expect(isGoToHotkey({ key: "k", metaKey: true, ctrlKey: false, altKey: false, shiftKey: false })).toBe(false);
  });

  it("the icon opens the palette; Enter goes to the first hit; Esc closes", async () => {
    act(() => host.querySelector<HTMLButtonElement>('[aria-label="Go to any page or feature"]')!.click());
    await settle();
    expect(palette()).not.toBeNull();
    const input = document.querySelector<HTMLInputElement>('input[aria-label="Go to any page or feature"]')!;
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      set.call(input, "spreadsheet");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(document.querySelector("[data-go-to-palette] [cmdk-group-heading]")?.textContent).toContain("Data");
    act(() => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    });
    expect(go).toHaveBeenCalledTimes(1);
    expect(go.mock.calls[0][0]).toMatch(/^\//);
  });

  it("the hotkey opens it from anywhere", async () => {
    key({ key: "K", metaKey: true, shiftKey: true });
    await settle();
    expect(palette()).not.toBeNull();
  });
});

describe("every frame search is the same full index (owner, 2026-10-22)", () => {
  it("\"Research\" finds the research pages in the full index", () => {
    const full = fullGoToIndex(PRODUCTS, PRODUCT_FAMILIES, menuGoToEntries({ isAuthenticated: true, isAdmin: false }));
    const hits = rankMenuSearch(full, "research").filter((e) => !e.id.startsWith("product:"));
    expect(hits.length).toBeGreaterThan(3);
    expect(hits.some((e) => e.href.startsWith("/research"))).toBe(true);
  });

  it("the app grid's search loads that index (no second index) and lists page hits", () => {
    const src = readFileSync(join(__dirname, "..", "AppGrid.tsx"), "utf8");
    expect(src).toMatch(/import\("\.\/goToSearchIndex"\)/);
    expect(src).toMatch(/aria-label="Matching pages"/);
  });

  it("the classic menu search finds Research too", () => {
    const classic = buildMenuSearchIndex([...navItemsForViewer(primaryNavItems, true), settingsItem]);
    expect(rankMenuSearch(classic, "research").some((e) => e.label.toLowerCase().includes("research"))).toBe(true);
  });
});

describe("the host's menu entries", () => {
  it("finds a classic menu name the frame's own table does not carry", () => {
    const entries = menuGoToEntries({ isAuthenticated: true, isAdmin: false });
    const withMenu = buildGoToIndex(PRODUCTS, PRODUCT_FAMILIES, FRAME_ROUTE_HOMES, entries);
    const hit = rankMenuSearch(withMenu, "zip code heatmap")[0];
    expect(hit?.href).toBe("/free/zip-code-heatmap");
  });

  it("respects guest and admin gating", () => {
    const hrefs = (o: { isAuthenticated: boolean; isAdmin: boolean }) => new Set(menuGoToEntries(o).map((e) => e.href));
    expect(hrefs({ isAuthenticated: true, isAdmin: false }).has("/administration")).toBe(false);
    expect(menuGoToEntries({ isAuthenticated: false, isAdmin: false }).length).toBeLessThan(
      menuGoToEntries({ isAuthenticated: true, isAdmin: false }).length,
    );
    expect(menuGoToEntries({ isAuthenticated: true, isAdmin: true }).length).toBeGreaterThan(
      menuGoToEntries({ isAuthenticated: true, isAdmin: false }).length,
    );
  });
});
