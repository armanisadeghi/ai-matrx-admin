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
 *  11. headers have no bottom rule (the top edge is the frame's hairline-or-fade); no chevron on the
 *      right-side icons — chevrons belong only to switchable crumbs, as a down chevron;
 *  12. the side chat adds no chat code to a page: no frame or playground file imports
 *      @ai-matrx/chat statically (only a lazy loader may).
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
  formFor,
  frameAppearanceAttributes,
  type AppFrameProps,
} from "../AppFrame";
import {
  FRAME_SIDEBAR_WIDTH_COOKIE,
  frameGeometryFromCookies,
  readFrameCookie,
} from "../geometry";
import { HeaderToolButtons } from "../SheetHeader";
import { GRID_FAVORITES_MAX, GRID_TILE_TALL_PX, gridLayout } from "../AppGrid";
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

/** The frame remembers geometry in cookies (geometry.ts): start each case with none. */
function clearCookies() {
  for (const part of document.cookie.split("; ")) {
    const name = part.split("=")[0];
    if (name) document.cookie = `${name}=; path=/; max-age=0`;
  }
}

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
    headerTools: <HeaderToolButtons tools={[{ id: "search", label: "Search", icon: Search }]} />,
    phoneTools: [{ id: "search", label: "Search", icon: Search, phone: "show" }],
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
    const agent = q<HTMLButtonElement>('header button[aria-label="Side chat"]')!;
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
    // Exactly one tile, and the Edit grid button under the grid.
    expect(stops.map((el) => el.textContent?.trim())).toEqual([expect.stringContaining("Chat"), "Edit grid"]);

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
  // The frame reads storage and the address on the next animation frame.
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
  await new Promise((r) => setTimeout(r, 0));
});

function footerButton(text: string) {
  return [...frame().querySelectorAll<HTMLButtonElement>("footer button")].find((b) =>
    b.textContent?.includes(text),
  )!;
}
/** The side chat's door: the header's right group (SIDE_CHAT_DOOR). */
const sideChatDoor = () => q<HTMLButtonElement>('header button[aria-label="Side chat"]')!;

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
    clearCookies();
    const loader = jest.fn(() => Promise.resolve({ default: TestCompanion }));
    mount(base({ form: "desktop", loadCompanion: loader }));
    await flush();
    expect(loader).not.toHaveBeenCalled();
    expect(q('[data-testid="loaded-companion"]')).toBeNull();
    act(() => sideChatDoor().click());
    await flush();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(q('[data-testid="loaded-companion"]')).not.toBeNull();
    act(() => sideChatDoor().click());
    act(() => sideChatDoor().click());
    await flush();
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("the ask bar is a plain input: sending opens the side chat and delivers the text", async () => {
    clearCookies();
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
    expect(sideChatDoor().getAttribute("aria-pressed")).toBe("true");
  });

  it("is closed by default, and a host controls it (the Side Chat's one rule lives in the package)", async () => {
    mount(base({ form: "desktop" }));
    await flush();
    expect(sideChatDoor().getAttribute("aria-pressed")).toBe("false");
    act(() => root.unmount());
    const changes: boolean[] = [];
    mount(base({ form: "desktop", companionOpen: true, onCompanionOpenChange: (open: boolean) => changes.push(open) }));
    await flush();
    expect(sideChatDoor().getAttribute("aria-pressed")).toBe("true");
    act(() => sideChatDoor().click());
    // Controlled: the frame asks, the host decides (still open until the host says otherwise).
    expect(changes).toEqual([false]);
    expect(sideChatDoor().getAttribute("aria-pressed")).toBe("true");
  });
});

describe("the canvas is controllable (a canvas store opens it from any page)", () => {
  it("a host's canvasOpen opens the canvas; the toggle asks the host", async () => {
    const changes: boolean[] = [];
    const loader = jest.fn(() => Promise.resolve({ default: TestCanvas }));
    mount(base({ form: "wide", loadCanvas: loader, canvasOpen: true, onCanvasOpenChange: (open: boolean) => changes.push(open) }));
    await flush();
    expect(loader).toHaveBeenCalledTimes(1);
    expect(q('[data-mf-region="canvas"]')!.hasAttribute("inert")).toBe(false);
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
    act(() => sideChatDoor().click());
    act(() => q<HTMLButtonElement>('header [aria-label="Canvas"]')!.click());
    expect(sideChatDoor().getAttribute("aria-pressed")).toBe("false");
    act(() => sideChatDoor().click());
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

  it("headers have no bottom rule; right-side icons carry no chevron", () => {
    mount(base({ form: "desktop", sidebarOpen: false }));
    expect(q("header")!.className).not.toContain("mf-rule-b");
    for (const label of ["More actions", "All products", "Search", "Side chat", "Canvas"]) {
      const b = q(`header [aria-label="${label}"]`);
      expect(b).not.toBeNull();
      expect(b!.querySelector("svg.lucide-chevron-right, svg.lucide-chevron-down")).toBeNull();
    }
  });

  it("a switchable crumb has a down chevron listing its siblings; the top level may be its icon alone", async () => {
    mount(
      base({
        form: "desktop",
        crumbs: [
          { id: "crm", label: "CRM", icon: Search, iconOnly: true, href: "/crm" },
          { id: "people", label: "People & Companies", href: "/crm/people" },
          {
            id: "c1",
            label: "Marisol",
            optionsLabel: "People",
            options: [
              { label: "Marisol", href: "/crm/c1", active: true },
              { label: "Theo", href: "/crm/c2" },
            ],
          },
        ],
      }),
    );
    const nav = q('nav[aria-label="Breadcrumb"]')!;
    const top = nav.querySelector("a[href='/crm']")!;
    expect(top.textContent).toBe("CRM"); // the sr-only name; the face is the icon
    expect(top.querySelector("svg")).not.toBeNull();
    const switcher = nav.querySelector<HTMLButtonElement>('[aria-label="Switch People"]')!;
    expect(switcher.querySelector("svg.lucide-chevron-down")).not.toBeNull();
    // Only the switchable level carries a chevron-down.
    expect(nav.querySelectorAll("svg.lucide-chevron-down")).toHaveLength(1);
    act(() => {
      switcher.focus();
      switcher.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    });
    await flush();
    const items = [...document.querySelectorAll('[role="menuitem"]')].map((el) => el.textContent?.trim());
    expect(items).toEqual(["Marisol", "Theo"]);
    expect(document.querySelector('[role="menuitem"][aria-current="page"]')?.textContent?.trim()).toBe("Marisol");
  });

  it("the top edge: a fade by default, a hairline on request, on the last top band", () => {
    mount(base({ form: "desktop" }));
    expect(frame().getAttribute("data-header-edge")).toBe("fade");
    expect(q("header")!.classList.contains("mf-top-edge")).toBe(true);
    const css = readFileSync(join(__dirname, "..", "frame.css"), "utf8");
    // The fade takes no layout height: no padding on scroll areas, an 8px overlay with a negative
    // margin, shown only once the area scrolls.
    expect(css).not.toMatch(/\.mf-scroll-top \{[^}]*padding-top/);
    expect(css).toMatch(/--matrx-frame-fade-h: 8px/);
    const fade = css.slice(css.indexOf('.mf-scroll-top::before'));
    expect(fade).toMatch(/margin-bottom: calc\(-1 \* var\(--matrx-frame-fade-h\)\)/);
    expect(fade).toMatch(/opacity: 0;[\s\S]*animation-timeline: scroll\(nearest block\)/);
  });
});

describe("zero weight: no chat code before the side chat is engaged", () => {
  it("no frame or playground file imports @ai-matrx/chat statically", () => {
    const roots = [join(__dirname, ".."), join(__dirname, "..", "..", "..", "..", "app", "(lab)", "lab", "shell")];
    const offenders: string[] = [];
    let scanned = 0;
    for (const dir of roots) {
      for (const file of readdirSync(dir).filter((f) => /\.(ts|tsx)$/.test(f))) {
        scanned += 1;
        const src = readFileSync(join(dir, file), "utf8");
        // `import … from "@ai-matrx/chat…"` or `export … from` — a lazy `import("…")` is the only allowed door.
        if (/(?:^|\n)\s*(?:import|export)\b[^;]*?\bfrom\s*["']@ai-matrx\/chat/.test(src) || /(?:^|\n)\s*import\s*["']@ai-matrx\/chat/.test(src)) {
          offenders.push(file);
        }
      }
    }
    expect(scanned).toBeGreaterThan(10);
    expect(offenders).toEqual([]);
  });
});

describe("product marks (owner, 2026-10-20: Google's way)", () => {
  it("the glyph carries the product's color and fills its cell; nothing tints the tile", async () => {
    mount(base({ form: "desktop" }));
    act(() => q<HTMLButtonElement>('[aria-label="All products"]')!.click());
    await nextFrame();
    const marks = [...document.querySelectorAll<HTMLElement>('[role="group"][aria-label="Products"] [data-mf-mark]')];
    expect(marks.length).toBeGreaterThan(5);
    const chatMark = marks.find((m) => m.getAttribute("data-mf-mark") === chat.color)!;
    expect(chatMark.getAttribute("style")).toContain(`--matrx-chip-${chat.color}-ink`);
    for (const m of marks) {
      expect(m.className).toContain("size-8");
      // Whole pixels on the SVG itself: 32px, stroke 1.75, no scaling.
      expect(m.querySelector("svg")!.getAttribute("width")).toBe("32");
      expect(m.querySelector("svg")!.getAttribute("stroke-width")).toBe("1.75");
      expect(m.className).not.toMatch(/\bbg-|rounded/);
    }
    const css = readFileSync(join(__dirname, "..", "frame.css"), "utf8");
    expect(css).not.toMatch(/\.mf-mark\s*\{[^}]*background/);
    expect(css).not.toContain(".mf-glyph");
  });
});

describe("the lineup follows the owner's tree (common-docs/projects/app-frame/TREE.md)", () => {
  it("families and tiles, in order", () => {
    const byFamily = PRODUCT_FAMILIES.map((f) => [
      f.label,
      PRODUCTS.filter((p) => p.family === f.id).map((p) => p.name),
    ]);
    expect(byFamily).toEqual([
      ["Yours", ["Home", "Workspace", "Chat"]],
      ["Memory", ["Memory"]],
      ["Build", ["Intelligence", "Masterwork", "Applets", "Code", "Connectors"]],
      ["Productivity", ["Docs", "Data", "Drive", "Media", "Audio"]],
      ["Business", ["CRM", "HR", "Marketing", "Meet", "Messages", "Business Tools"]],
      ["Solutions", ["Education", "Legal", "Medical", "E-Commerce", "Other"]],
      ["More", ["More"]],
    ]);
  });

  it("Memory's sidebar mirrors the tree, and its mark is its own", () => {
    const memory = PRODUCTS.find((p) => p.id === "memory")!;
    expect(memory.menu.map((s) => [s.label ?? "", s.items.map((i) => i.label)])).toEqual([
      ["", ["Ask & search", "Topics", "Everything", "Concepts"]],
      ["Research", ["Research", "Library", "Sources", "Graph, extractions, data stores"]],
      ["", ["Capture", "Forget & archive", "Advanced"]],
    ]);
    const intelligence = PRODUCTS.find((p) => p.id === "intelligence")!;
    expect(memory.icon).not.toBe(intelligence.icon);
    expect(PRODUCTS.filter((p) => p.icon === memory.icon)).toHaveLength(1);
  });
});

describe("the app grid is Google-tight (owner, 2026-10-20 fourth round)", () => {
  const nine = ["chat", "memory", "workspace", "docs", "drive", "data", "crm", "intelligence", "meet"];
  async function openGrid(props: Partial<AppFrameProps> = {}) {
    mount(base({ form: "desktop", favorites: nine, ...props }));
    act(() => q<HTMLButtonElement>('[aria-label="All products"]')!.click());
    await nextFrame();
    return document.querySelector<HTMLElement>('[role="group"][aria-label="Products"]')!;
  }
  const names = (root: Element) =>
    [...root.querySelectorAll("[data-mf-mark]")].map((m) => m.parentElement!.querySelector(".mf-grid-name")!.textContent);

  it("A: nine favorites in the card, then every other product once, in family order, with no heading rows", async () => {
    const grid = await openGrid();
    const card = grid.querySelector('[aria-label="Your favorites"]')!;
    expect(card.className).toContain("grid-cols-5");
    expect(names(card)).toEqual(["Chat", "Memory", "Workspace", "Docs", "Drive", "Data", "CRM", "Intelligence", "Meet"]);
    const list = names(grid.querySelector('[aria-label="All products"]')!);
    const expected = PRODUCT_FAMILIES.flatMap((f) => PRODUCTS.filter((p) => p.family === f.id && !nine.includes(p.id))).map((p) => p.name);
    expect(list).toEqual(expected);
    // Nothing appears twice in the popover, and no family heading rows.
    const all = names(grid);
    expect(new Set(all).size).toBe(PRODUCTS.length);
    expect(all).toHaveLength(PRODUCTS.length);
    expect(grid.querySelectorAll(".type-label")).toHaveLength(0);
    // Tight cells sized for the screen's height (72px tall screens, 60px short), one-line names.
    const { tile: tilePx } = gridLayout(window.innerHeight, 9, 0);
    expect(gridLayout(900, 9, 0).tile).toBe(GRID_TILE_TALL_PX);
    for (const tile of grid.querySelectorAll("[data-mf-mark]")) {
      expect(tile.parentElement!.style.height).toBe(`${tilePx}px`);
      expect(tile.parentElement!.querySelector(".mf-grid-name")!.className).toContain("truncate");
    }
  });

  it("never scrolls at common screen heights (owner, 2026-10-22: scrolling the grid is ridiculous)", () => {
    // Room under the button: the screen less the header row, the search row and a margin.
    for (const height of [1080, 900, 800, 768, 700, 640]) {
      const { bodyHeight } = gridLayout(height, GRID_FAVORITES_MAX, PRODUCTS.length - GRID_FAVORITES_MAX);
      expect({ height, fits: bodyHeight <= height - 44 - 48 - 8 }).toEqual({ height, fits: true });
    }
    const css = readFileSync(join(__dirname, "../frame.css"), "utf8");
    expect(css).toMatch(/\.mf-grid-scroll \{\s*max-height: calc\(var\(--radix-popover-content-available-height/);
  });

  // ── the grid's search (owner, 2026-10-21) ──
  const searchBox = () => document.querySelector<HTMLInputElement>('input[aria-label="Search products"]')!;
  function type(input: HTMLInputElement, value: string) {
    const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      set.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }
  const press = (el: Element, key: string) =>
    act(() => {
      el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    });

  it("a search field tops the grid and has focus when it opens", async () => {
    await openGrid();
    expect(searchBox()).not.toBeNull();
    expect(document.activeElement).toBe(searchBox());
  });

  it("typing filters the tiles by name: favorites card and other tiles give way to the matches", async () => {
    const grid = await openGrid({ favorites: nine });
    type(searchBox(), "crm");
    expect(names(grid)).toEqual(["CRM"]);
    expect(grid.querySelector(".mf-grid-card")).toBeNull();
  });

  it("it also matches a product's sections and pages, not only its name", async () => {
    const grid = await openGrid({ favorites: nine });
    type(searchBox(), "sandboxes");
    expect(names(grid)).toContain("Code");
    expect(names(grid).length).toBeLessThan(PRODUCTS.length);
  });

  it("no match says so", async () => {
    const grid = await openGrid();
    type(searchBox(), "zzzzqqq");
    expect(names(grid)).toEqual([]);
    // The page index loads on the first keystroke; until it lands the grid says it is still searching.
    await act(async () => {
      await new Promise<void>((r) => setTimeout(r, 300));
    });
    expect(grid.textContent).toContain("Nothing matches");
  });

  it("Enter opens the first match in a new tab", async () => {
    await openGrid();
    const opened = jest.spyOn(window, "open").mockReturnValue(null);
    type(searchBox(), "crm");
    press(searchBox(), "Enter");
    expect(opened).toHaveBeenCalled();
    expect(String(opened.mock.calls[0][0])).toContain(PRODUCTS.find((p) => p.id === "crm")!.homeHref);
    expect(opened.mock.calls[0][1]).toBe("_blank");
    opened.mockRestore();
  });

  it("ArrowDown moves into the tiles (one Tab stop kept); Esc clears the field before the grid closes", async () => {
    const grid = await openGrid();
    type(searchBox(), "c");
    press(searchBox(), "ArrowDown");
    expect(document.activeElement?.hasAttribute("data-mf-tile")).toBe(true);
    expect(grid.querySelectorAll('[data-mf-tile][tabindex="0"]')).toHaveLength(1);
    searchBox().focus();
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });
    expect(searchBox().value).toBe("");
    expect(document.querySelector('[role="group"][aria-label="Products"]')).not.toBeNull();
  });

  it("only grid A exists: no look switch, no family dividers, no filled marks", () => {
    const src = readFileSync(join(__dirname, "..", "AppGrid.tsx"), "utf8");
    expect(src).not.toMatch(/FrameGridLook|look === /);
    const css = readFileSync(join(__dirname, "..", "frame.css"), "utf8");
    expect(css).not.toMatch(/mf-grid-divider|mf-mark-filled/);
  });
});

describe("the sidebar resizes (owner, 2026-10-21)", () => {
  const handle = () => q<HTMLElement>('[role="separator"][aria-label="Resize sidebar"]')!;
  const sidebarBox = () => q<HTMLElement>('[data-mf-region="sidebar"]')!;
  // jsdom has no pointer capture or PointerEvent: React's onPointerDown listens to the event TYPE.
  const pointer = (el: HTMLElement, type: string, clientX: number) =>
    el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX, button: 0 }));
  beforeAll(() => {
    Element.prototype.setPointerCapture ??= function setPointerCapture() {};
  });

  it("244 by default; drag widens it within 200–400, remembered on this device, no motion while dragging", async () => {
    clearCookies();
    mount(base({ form: "desktop" }));
    await flush();
    expect(sidebarBox().style.width).toBe("244px");
    const h = handle();
    act(() => pointer(h, "pointerdown", 244));
    expect(frame().hasAttribute("data-dragging")).toBe(true);
    act(() => pointer(h, "pointermove", 300));
    expect(sidebarBox().style.width).toBe("300px");
    act(() => pointer(h, "pointermove", 900));
    expect(sidebarBox().style.width).toBe("400px");
    act(() => pointer(h, "pointerup", 900));
    expect(frame().hasAttribute("data-dragging")).toBe(false);
    expect(readFrameCookie(FRAME_SIDEBAR_WIDTH_COOKIE)).toBe("400");
  });

  it("dragging past the minimum snaps it shut and keeps the remembered width", async () => {
    clearCookies();
    mount(base({ form: "desktop" }));
    await flush();
    const h = handle();
    act(() => pointer(h, "pointerdown", 244));
    act(() => pointer(h, "pointermove", 60));
    act(() => pointer(h, "pointerup", 60));
    expect(sidebarBox().style.width).toBe("0px");
    expect(sidebarBox().hasAttribute("inert")).toBe(true);
    expect(readFrameCookie(FRAME_SIDEBAR_WIDTH_COOKIE)).toBeNull();
  });

  it("the arrow keys resize it too", async () => {
    clearCookies();
    mount(base({ form: "desktop" }));
    await flush();
    act(() => {
      handle().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }));
    });
    expect(sidebarBox().style.width).toBe("260px");
  });
});

describe("space around and sidebar color (owner's comparisons, 2026-10-21)", () => {
  it("the frame says which it is, and the CSS has both answers in both themes", () => {
    mount(base({ form: "desktop", space: "flush", sidebarColor: "same" }));
    expect(frame().getAttribute("data-space")).toBe("flush");
    expect(frame().getAttribute("data-sidebar-color")).toBe("same");
    const css = readFileSync(join(__dirname, "..", "frame.css"), "utf8");
    expect(css).toMatch(/\[data-space="flush"\] \{\s*--matrx-frame-inset: 0px;\s*--matrx-frame-radius: 0px;/);
    expect(css).toMatch(/\.dark \[data-matrx-frame\]\[data-sidebar-color="same"\] \{\s*--matrx-frame-canvas: var\(--matrx-frame-sheet\)/);
    // The "same" rule must come after the dark block, or dark mode keeps the contrast.
    expect(css.indexOf('[data-sidebar-color="same"]')).toBeGreaterThan(css.indexOf(".dark [data-matrx-frame],"));
  });
});

describe("chrome slots (ROLLOUT-PLAN blocking change #1)", () => {
  it("headerTools is the host's own node, before the frame's side chat and canvas toggles", () => {
    mount(base({ form: "desktop", headerTools: <button type="button" data-testid="host-tool">Host</button> }));
    const group = q('header [data-mf-region="header-tools"]')!;
    expect(group).not.toBeNull();
    const order = [...group.querySelectorAll("button")].map((b) => b.getAttribute("data-testid") ?? b.getAttribute("aria-label"));
    expect(order).toEqual(["host-tool", "Side chat", "Canvas"]);
  });

  it("on a phone the node is not drawn: phoneTools 'show' stay, the rest are '…' items", async () => {
    mount(
      base({
        form: "phone",
        headerTools: <button type="button" data-testid="host-tool">Host</button>,
        phoneTools: [
          { id: "search", label: "Search", icon: Search, phone: "show" },
          { id: "bell", label: "Notifications", icon: Search },
        ],
      }),
    );
    expect(q('[data-testid="host-tool"]')).toBeNull();
    expect(q('header [aria-label="Search"]')).not.toBeNull();
    expect(q('header [aria-label="Notifications"]')).toBeNull();
  });

  it("sidebarFooter sits under the menu in the inline sidebar and in the phone drawer", () => {
    const footer = <span data-testid="account">Account</span>;
    mount(base({ form: "desktop", sidebarFooter: footer }));
    const inline = q('[data-mf-region="sidebar"] [data-mf-region="sidebar-footer"]');
    expect(inline?.querySelector('[data-testid="account"]')).not.toBeNull();
    act(() => root.unmount());
    mount(base({ form: "phone", sidebarFooter: footer }));
    expect(q('[data-mf-region="drawer"] [data-mf-region="sidebar-footer"] [data-testid="account"]')).not.toBeNull();
  });

  it("appearance stamps AppShell's attributes: data-shell-look and the design system's accent + tokens", () => {
    mount(base({ form: "desktop", appearance: { look: "meet-matrx", accent: "#7c3aed" } }));
    expect(frame().getAttribute("data-shell-look")).toBe("meet-matrx");
    expect(frame().getAttribute("data-matrx-accent")).toBe("custom");
    expect(frame().style.getPropertyValue("--matrx-accent-primary")).not.toBe("");
    act(() => root.unmount());
    mount(base({ form: "desktop" }));
    expect(frame().hasAttribute("data-shell-look")).toBe(false);
    expect(frame().hasAttribute("data-matrx-accent")).toBe(false);
    // A curated id stamps that id ("blue" is the built-in primary, so it stamps nothing).
    expect(frameAppearanceAttributes({ accent: "violet" }).attrs["data-matrx-accent"]).toBe("violet");
    expect(frameAppearanceAttributes({ accent: "blue" }).attrs["data-matrx-accent"]).toBeUndefined();
  });
});

describe("geometry the server can read (ROLLOUT-PLAN Attack #4)", () => {
  it("initialGeometry paints the remembered widths and this page's side chat in the first render", () => {
    clearCookies();
    mount(
      base({
        form: "desktop",
        companionOpen: true,
        initialGeometry: { sidebarWidth: 320, companionWidth: 500 },
      }),
    );
    // No effect has run: this is what the server rendered.
    expect(sidebarBoxAt().style.width).toBe("320px");
    expect(sideChatDoor().getAttribute("aria-pressed")).toBe("true");
    expect(q<HTMLElement>('[data-mf-region="side-chat"]')!.style.width).toBe("500px");
  });

  it("the server reader turns the cookie header into initialGeometry", () => {
    const jar: Record<string, string> = {
      "matrx-frame:sidebar-width": "300",
      "matrx-frame:side-chat-width": "garbage",
    };
    expect(frameGeometryFromCookies((n) => jar[n])).toEqual({ sidebarWidth: 300, companionWidth: null });
  });

  it("the frame never writes geometry to localStorage", () => {
    const src = readFileSync(join(__dirname, "..", "AppFrame.tsx"), "utf8");
    expect(src).not.toMatch(/localStorage/);
  });
});

function sidebarBoxAt() {
  return q<HTMLElement>('[data-mf-region="sidebar"]')!;
}
