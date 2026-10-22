/**
 * THE SIDEBAR'S PINNED SECTION AND BIG ITEMS (owner, 2026-10-22).
 *   1. Pinned: the person's pins as real links; empty = the space plus a short hint; no `pins`
 *      prop = no section; a plain click goes to the host's handler;
 *   2. Big items: off | top | bottom (default bottom); the current product is highlighted; every
 *      row opens a new tab (a product switch always does); they are the person's own first grid
 *      favorites, in their order (owner, 2026-10-22: never a hardcoded list).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AppFrame, type AppFrameProps } from "../AppFrame";
import { PINNED_EMPTY_HINT } from "../FrameSidebar";
import { BIG_ITEM_COUNT, DEFAULT_GRID_FAVORITES, PRODUCTS, PRODUCT_FAMILIES } from "../products";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= NoopResizeObserver;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

const chat = PRODUCTS.find((p) => p.id === "chat")!;
let host: HTMLElement;
let root: Root;

function mount(overrides: Partial<AppFrameProps> = {}) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() =>
    root.render(
      <AppFrame
        products={PRODUCTS}
        families={PRODUCT_FAMILIES}
        product={chat}
        favorites={["chat"]}
        onFavoritesChange={() => {}}
        crumbs={[{ id: "chat", label: "Chat" }]}
        actions={[]}
        variant="record"
        form="desktop"
        {...overrides}
      >
        <p>Body</p>
      </AppFrame>,
    ),
  );
}
const sidebar = () => host.querySelector<HTMLElement>('[data-mf-region="sidebar"]')!;
const q = (sel: string) => sidebar().querySelector<HTMLElement>(sel);

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

describe("Pinned", () => {
  it("no pins prop: no Pinned section", () => {
    mount();
    expect(q('[data-mf-region="pinned"]')).toBeNull();
  });

  it("empty: the space is there with the hint", () => {
    mount({ pins: [] });
    expect(q('[data-mf-region="pinned"]')).not.toBeNull();
    expect(q("[data-mf-pinned-empty]")?.textContent).toBe(PINNED_EMPTY_HINT);
    expect(PINNED_EMPTY_HINT.length).toBeLessThanOrEqual(60);
  });

  it("pins render as real links; a plain click goes to the host, a modified click keeps the link", () => {
    const opened: string[] = [];
    mount({
      pins: [{ id: "p1", label: "Quarterly plan", href: "/chat/abc" }],
      onSelectPin: (pin) => opened.push(pin.id),
    });
    const a = q('[data-mf-region="pinned"] a')!;
    expect(a.getAttribute("href")).toBe("/chat/abc");
    expect(q("[data-mf-pinned-empty]")).toBeNull();
    act(() => {
      a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
    });
    expect(opened).toEqual(["p1"]);
    const modified = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, metaKey: true });
    act(() => {
      a.dispatchEvent(modified);
    });
    expect(modified.defaultPrevented).toBe(false);
    expect(opened).toEqual(["p1"]);
  });
});

describe("Big items", () => {
  const region = () => q('[data-mf-region="big-items"]');

  it("default is the bottom, below the menu", () => {
    mount();
    expect(region()?.getAttribute("data-edge")).toBe("bottom");
    const menu = sidebar().querySelector(".overflow-y-auto")!;
    expect(menu.contains(region())).toBe(false);
  });

  it("top sits inside the scrolling menu; off removes it", () => {
    mount({ bigItems: "top" });
    expect(region()?.getAttribute("data-edge")).toBe("top");
    expect(sidebar().querySelector(".overflow-y-auto")!.contains(region())).toBe(true);
    act(() => root.unmount());
    host.remove();
    mount({ bigItems: "off" });
    expect(region()).toBeNull();
  });

  it("big items are the person's own first grid favorites, in their order", () => {
    mount({ favorites: ["crm", "nope", "chat"] });
    const hrefs = [...region()!.querySelectorAll<HTMLAnchorElement>("a")].map((a) => a.getAttribute("href"));
    const href = (id: string) => PRODUCTS.find((p) => p.id === id)!.homeHref;
    expect(hrefs).toEqual([href("crm"), href("chat")]);
  });

  it("lists the big products, highlights the current one, and every row opens a new tab", () => {
    mount({ favorites: DEFAULT_GRID_FAVORITES });
    const links = [...region()!.querySelectorAll<HTMLAnchorElement>("a")];
    expect(links).toHaveLength(BIG_ITEM_COUNT);
    expect(links.every((a) => a.target === "_blank")).toBe(true);
    const current = links.filter((a) => a.getAttribute("aria-current") === "page");
    expect(current).toHaveLength(1);
    expect(current[0].getAttribute("href")).toBe(chat.homeHref);
  });
});
