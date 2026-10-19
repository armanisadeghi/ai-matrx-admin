/**
 * THE APP FRAME CONTRACT — what every product's page gets, whatever its variant.
 *
 *   1. one header row (44px, from `--matrx-frame-header-h`) in every variant;
 *   2. the star only when the item can be favorited; the "…" menu always;
 *   3. the tabs row only when the page passes tabs;
 *   4. no footer in the phone form;
 *   5. the drawer: focus moves in, Tab stays inside, Esc closes, focus returns to the opener;
 *   6. the app grid: one Tab stop for the whole grid (roving tabindex), arrows move inside;
 *   7. medium form: the properties panel and the companion are never shown together.
 *
 * PROVEN FAILING BEFORE PASSING (2026-10-18): removing the Tab wrap in useModalPanel's
 * onKeyDown turned case 5 RED; giving every tile tabIndex 0 in AppGrid turned case 6 RED.
 */
import React, { act } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRoot, type Root } from "react-dom/client";
import { Search } from "lucide-react";
import { AppFrame, type AppFrameProps } from "../AppFrame";
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
    const agent = [...frame().querySelectorAll("footer button")].find((b) => b.textContent?.includes("Agent"))!;
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

