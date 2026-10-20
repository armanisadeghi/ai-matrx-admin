/**
 * THE APP FRAME CONTRACT — what every product's page gets, whatever its variant.
 *
 *   1. one header row (44px, from `--matrx-frame-header-h`) in every variant;
 *   2. the star only when the item can be favorited; the "…" menu always;
 *   3. the tabs row only when the page passes tabs;
 *   4. no footer in the phone form;
 *   5. the drawer: focus moves in, Tab stays inside, Esc closes, focus returns to the opener;
 *   6. the app grid: one Tab stop for the whole grid (roving tabindex), arrows move inside;
 *   7. medium form: the properties panel and the side chat are never shown together;
 *   8. the side chat and the canvas load only when first engaged (their loaders are never called
 *      on render), the canvas stays mounted once loaded, and the ask bar hands its text over;
 *   9. a page gets no say over the frame's look: no exported props type takes className or style;
 *  10. the side chat is closed by default and remembered per page; a link wins until the person acts;
 *  11. headers have no bottom rule; every menu or popover trigger carries the right chevron.
 *
 * PROVEN FAILING BEFORE PASSING (2026-10-18): removing the Tab wrap in useModalPanel's
 * onKeyDown turned case 5 RED; giving every tile tabIndex 0 in AppGrid turned case 6 RED.
 */
import React, { act } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRoot, type Root } from "react-dom/client";
import { Search } from "lucide-react";
import { readdirSync } from "node:fs";
import {
  AppFrame,
  canvasWidthFor,
  companionOpenKey,
  formFor,
  type AppFrameProps,
} from "../AppFrame";
import type { CanvasProps, CompanionProps } from "../types";
import { PRODUCTS, PRODUCT_FAMILIES } from "../products";
import type { FrameVariant } from "../types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= NoopResizeObserver;
// jsdom has no layout: scrolling a focused tile into view is a no-op here.
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

const VARIANTS: FrameVariant[] = ["record", "list", "workspace", "light"];
const chat = PRODUCTS.find((p) => p.id === "chat")!;

let host: HTMLElement;
let root: Root;

function base(overrides: Partial<AppFrameProps> = {}): AppFrameProps {
  return {
    products: PRODUCTS,
    families: PRODUCT_FAMILIES,
    product: chat,
    favorites: ["chat", "crm"],
    onFavoritesChange: () => {},
    crumbs: [
      { id: "chat", label: "Chat", href: "/chat" },
      { id: "c-1", label: "Quarterly plan" },
    ],
    actions: [{ id: "copy", label: "Copy link", onSelect: () => {} }],
    headerTools: [{ id: "search", label: "Search", icon: Search, phone: "show" }],
    variant: "record",
    children: <p>Body</p>,
    ...overrides,
  };
}

function mount(props: AppFrameProps) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<AppFrame {...props} />));
}

const q = <T extends Element = HTMLElement>(sel: string) => host.querySelector<T>(sel);
const frame = () => q("[data-matrx-frame]")!;
const nextFrame = () => act(() => new Promise<void>((r) => requestAnimationFrame(() => r())));

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

describe("the header row is the same in every variant", () => {
  it("the header height token is 44px", () => {
    const css = readFileSync(join(__dirname, "..", "frame.css"), "utf8");
    expect(css).toMatch(/--matrx-frame-header-h:\s*44px/);
  });

  it.each(VARIANTS)("%s: one header row on the header-height token, with the '…' menu", (variant) => {
    mount(base({ variant }));
    const headers = frame().querySelectorAll("header");
    expect(headers).toHaveLength(1);
    expect(headers[0].className).toContain("h-[var(--matrx-frame-header-h)]");
    expect(q('header [aria-label="More actions"]')).not.toBeNull();
    expect(q('header [aria-label="Search"]')).not.toBeNull();
  });

  it("the star appears only when the item can be favorited", () => {
    mount(base());
    expect(q('[aria-label="Add to favorites"]')).toBeNull();
    act(() => root.unmount());
    mount(base({ favorite: { starred: false, onToggle: () => {} } }));
    expect(q('[aria-label="Add to favorites"]')).not.toBeNull();
  });

  it("the tabs row appears only when the page passes tabs", () => {
    mount(base());
    expect(q('[aria-label="Views"]')).toBeNull();
    act(() => root.unmount());
    mount(
      base({
        tabs: {
          label: "Views",
          value: "all",
          onValueChange: () => {},
          items: [
            { value: "all", label: "All" },
            { value: "mine", label: "Mine" },
          ],
        },
      }),
    );
    expect(q('[aria-label="Views"]')).not.toBeNull();
  });
});

describe("forms", () => {
  it("desktop has the footer; phone has none and keeps search plus '…' in the header", () => {
    mount(base({ form: "desktop" }));
    expect(frame().querySelector("footer")).not.toBeNull();
    act(() => root.unmount());
    mount(base({ form: "phone" }));
    expect(frame().querySelector("footer")).toBeNull();
    expect(q('header [aria-label="Search"]')).not.toBeNull();
    expect(q('header [aria-label="More actions"]')).not.toBeNull();
  });

  it("medium never shows the properties panel and the companion together", () => {
    mount(base({ form: "medium", properties: <p>Props</p> }));
    const props = () => q('aside[aria-label="Properties"]');
    expect(props()).not.toBeNull();
    const agent = [...frame().querySelectorAll("footer button")].find((b) => b.textContent?.includes("Side chat"))!;
    act(() => (agent as HTMLButtonElement).click());
    expect(props()).toBeNull();
    // The person can switch back: the Properties toggle closes the companion.
    const toggle = [...frame().querySelectorAll("footer button")].find((b) =>
      b.textContent?.includes("Properties"),
    ) as HTMLButtonElement;
    expect(toggle).toBeDefined();
    act(() => toggle.click());
    expect(props()).not.toBeNull();
    expect(agent.getAttribute("aria-pressed")).toBe("false");
  });
});

describe("the drawer's focus contract", () => {
  it("focus moves in, Tab wraps inside, Esc closes, focus returns to the opener", async () => {
    mount(base({ form: "phone", crumbs: [{ id: "chat", label: "Chat" }] }));
    const opener = q<HTMLButtonElement>('header [aria-label="Open menu"]')!;
    act(() => opener.focus());
    act(() => opener.click());
    await nextFrame();
    const dialog = q('[role="dialog"]')!;
    expect(dialog.contains(document.activeElement)).toBe(true);

    // Tab from the last focusable wraps to the first.
    const focusables = [
      ...dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
    ];
    const last = focusables[focusables.length - 1];
    act(() => last.focus());
    act(() => {
      last.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(focusables[0]);

    act(() => {
      document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    await nextFrame();
    expect(q(".mf-drawer-layer")!.hasAttribute("inert")).toBe(true);
    expect(document.activeElement).toBe(opener);
  });
});

describe("the app grid is one Tab stop", () => {
  it("only one tile is tabbable, and arrow keys move between tiles", async () => {
    mount(base({ form: "desktop" }));
    const trigger = q<HTMLButtonElement>('[aria-label="All products"]')!;
    act(() => trigger.click());
    await nextFrame();
    const grid = document.querySelector<HTMLElement>('[role="group"][aria-label="Products"]')!;
    expect(grid).not.toBeNull();
    const tiles = [...grid.querySelectorAll<HTMLElement>("[data-mf-tile]")];
    expect(tiles.length).toBeGreaterThan(5);
    const stops = [...grid.querySelectorAll<HTMLElement>("a, button")].filter((el) => el.tabIndex === 0);
    // The Edit button and exactly one tile.
    expect(stops.map((el) => el.textContent?.trim())).toEqual(["Edit", expect.stringContaining("Chat")]);

    act(() => tiles[0].focus());
    act(() => {
      tiles[0].dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(tiles[1]);
    // The roving stop follows focus.
    expect(tiles[1].tabIndex).toBe(0);
    expect(tiles[0].tabIndex).toBe(-1);
    act(() => {
      tiles[1].dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true, cancelable: true }));
    });
    expect(document.activeElement).toBe(tiles[tiles.length - 1]);
  });
});


// ── round 4 ──

const flush = () => act(async () => {
  await Promise.resolve();
  await new Promise((r) => setTimeout(r, 0));
});

function footerButton(text: string) {
  return [...frame().querySelectorAll<HTMLButtonElement>("footer button")].find((b) =>
    b.textContent?.includes(text),
  )!;
}

function TestCompanion({ companionSeed }: CompanionProps) {
  return <div data-testid="loaded-companion">{companionSeed ? `seed:${companionSeed.text}` : "empty"}</div>;
}
function TestCanvas(_: CanvasProps) {
  const [n, setN] = React.useState(0);
  return (
    <button type="button" data-testid="loaded-canvas" onClick={() => setN(n + 1)}>
      count {n}
    </button>
  );
}

describe("the widths", () => {
  it("forms by frame width: phone < 640 ≤ medium < 1280 ≤ desktop < 1600 ≤ wide", () => {
    expect([375, 639, 640, 1279, 1280, 1599, 1600, 2560].map(formFor)).toEqual([
      "phone",
      "phone",
      "medium",
      "medium",
      "desktop",
      "desktop",
      "wide",
      "wide",
    ]);
  });
  it("the inline canvas is 34% of the sheet, between 440 and 960", () => {
    expect(canvasWidthFor(1000)).toBe(440);
    expect(canvasWidthFor(1660)).toBe(564);
    expect(canvasWidthFor(4000)).toBe(960);
  });
});

describe("the side chat loads only when engaged", () => {
  it("its loader is not called on render, is called once on the first open, never again", async () => {
    localStorage.clear();
    const loader = jest.fn(() => Promise.resolve({ default: TestCompanion }));
    mount(base({ form: "desktop", loadCompanion: loader }));
    await flush();
    expect(loader).not.toHaveBeenCalled();
    expect(q('[data-testid="loaded-companion"]')).toBeNull();
    act(() => footerButton("Side chat").click());
    await flush();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(q('[data-testid="loaded-companion"]')).not.toBeNull();
    act(() => footerButton("Side chat").click());
    act(() => footerButton("Side chat").click());
    await flush();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("the ask bar is a plain input: sending opens the side chat and delivers the text", async () => {
    localStorage.clear();
    const loader = jest.fn(() => Promise.resolve({ default: TestCompanion }));
    mount(base({ form: "desktop", askBar: true, loadCompanion: loader }));
    await flush();
    expect(loader).not.toHaveBeenCalled();
    const input = q<HTMLInputElement>('input[aria-label="Ask about this page"]')!;
    expect(input).not.toBeNull();
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, "What is due?");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    act(() => input.form!.requestSubmit());
    await flush();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(q('[data-testid="loaded-companion"]')!.textContent).toBe("seed:What is due?");
    expect(footerButton("Side chat").getAttribute("aria-pressed")).toBe("true");
  });

  it("is closed by default, remembered per page, and a link wins until the person acts", async () => {
    localStorage.clear();
    mount(base({ form: "desktop", pageKey: "a" }));
    await flush();
    expect(footerButton("Side chat").getAttribute("aria-pressed")).toBe("false");
    act(() => footerButton("Side chat").click());
    expect(localStorage.getItem(companionOpenKey("a"))).toBe("open");
    act(() => root.unmount());
    mount(base({ form: "desktop", pageKey: "b" }));
    await flush();
    expect(footerButton("Side chat").getAttribute("aria-pressed")).toBe("false");
    act(() => root.unmount());
    mount(base({ form: "desktop", pageKey: "a" }));
    await flush();
    expect(footerButton("Side chat").getAttribute("aria-pressed")).toBe("true");
    act(() => root.unmount());
    mount(base({ form: "desktop", pageKey: "a", companionLink: false }));
    await flush();
    expect(footerButton("Side chat").getAttribute("aria-pressed")).toBe("false");
  });
});

describe("the canvas loads only when engaged and then stays mounted", () => {
  it("not called on render; called once on open; its state survives close and reopen", async () => {
    const loader = jest.fn(() => Promise.resolve({ default: TestCanvas }));
    mount(base({ form: "wide", loadCanvas: loader }));
    await flush();
    expect(loader).not.toHaveBeenCalled();
    const toggle = q<HTMLButtonElement>('header [aria-label="Canvas"]')!;
    act(() => toggle.click());
    await flush();
    expect(loader).toHaveBeenCalledTimes(1);
    act(() => q<HTMLButtonElement>('[data-testid="loaded-canvas"]')!.click());
    expect(q('[data-testid="loaded-canvas"]')!.textContent).toBe("count 1");
    act(() => toggle.click());
    expect(q('[data-mf-region="canvas"]')!.hasAttribute("inert")).toBe(true);
    act(() => toggle.click());
    await flush();
    expect(q('[data-testid="loaded-canvas"]')!.textContent).toBe("count 1");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("below the wide form the canvas and the side chat take turns", async () => {
    mount(base({ form: "desktop" }));
    act(() => footerButton("Side chat").click());
    act(() => q<HTMLButtonElement>('header [aria-label="Canvas"]')!.click());
    expect(footerButton("Side chat").getAttribute("aria-pressed")).toBe("false");
    act(() => footerButton("Side chat").click());
    expect(q('header [aria-label="Canvas"]')!.getAttribute("aria-pressed")).toBe("false");
  });
});

describe("ours vs the page's", () => {
  it("no exported props type of the frame takes className or style", () => {
    const dir = join(__dirname, "..");
    const offenders: string[] = [];
    let seen = 0;
    for (const file of readdirSync(dir).filter((f) => /\.tsx?$/.test(f))) {
      const src = readFileSync(join(dir, file), "utf8");
      const re = /export\s+interface\s+(\w+(?:Props|Proposal)?)\b[^{]*\{/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        if (!/Props$/.test(m[1])) continue;
        seen += 1;
        let depth = 1;
        let i = re.lastIndex;
        while (depth > 0 && i < src.length) {
          if (src[i] === "{") depth += 1;
          else if (src[i] === "}") depth -= 1;
          i += 1;
        }
        const body = src.slice(re.lastIndex, i);
        if (/^\s*(className|style)\??\s*:/m.test(body)) offenders.push(`${file}: ${m[1]}`);
      }
    }
    expect(seen).toBeGreaterThanOrEqual(5);
    expect(offenders).toEqual([]);
  });

  it("every region says whose it is", () => {
    mount(base({ form: "desktop", askBar: true, properties: <p>Props</p> }));
    const owner = (region: string) => q(`[data-mf-region="${region}"]`)?.getAttribute("data-mf-owner");
    expect(["sidebar", "header", "side-chat", "canvas", "footer", "ask-bar"].map(owner)).toEqual(
      Array(6).fill("frame"),
    );
    expect(["body", "status", "properties"].map(owner)).toEqual(["page", "page", "page"]);
  });

  it("headers have no bottom rule; menu and popover triggers carry the right chevron", () => {
    mount(base({ form: "desktop", sidebarOpen: false }));
    expect(q("header")!.className).not.toContain("mf-rule-b");
    expect(q('header [aria-label="More actions"] svg.lucide-chevron-right')).not.toBeNull();
    expect(q('header [aria-label="All products"] svg.lucide-chevron-right')).not.toBeNull();
  });
});
