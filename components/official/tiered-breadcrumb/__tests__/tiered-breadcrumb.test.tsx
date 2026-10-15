/**
 * THE TIERED BREADCRUMB, one test per tier (Notion's breadcrumb menu).
 *
 *   Tier 1 — a segment opens its siblings: five, then "N more", which turns into a search over all
 *            of them; the siblings are read once however often the menu opens.
 *   Tier 2 — opening a page's submenu reads what it holds once, and draws it.
 *   Tier 3 — a held item's next tier rides with it (no read) and every row navigates.
 *
 * Drawn for real (React + Radix in jsdom), driven by the keyboard the way a person would.
 */
import * as React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

const push = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, back: jest.fn(), replace: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => "/spaces/harbor",
}));

import { TieredBreadcrumb } from "../TieredBreadcrumb";
import { capSiblings, filterItems, type TieredItem, type TieredSegment } from "../model";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

beforeAll(() => {
  // jsdom has neither; Radix and the phone check read them.
  window.matchMedia ??= ((query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false })) as never;
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollIntoView ??= () => undefined;
  (Element.prototype as { hasPointerCapture?: unknown }).hasPointerCapture ??= () => false;
});

const CLIENTS = ["Harbor Dental", "Northline Fitness", "Copperline Bakery", "Westgate Law", "Juniper Yoga", "Ridgeview Auto", "Saltwater Cafe"];
const page = (label: string, i: number): TieredItem => ({ id: `p${i}`, label, href: `/spaces/p${i}`, current: label === "Harbor Dental" });

let host: HTMLDivElement;
let root: Root;
beforeEach(() => {
  push.mockReset();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  document.body.innerHTML = "";
});

const flush = async () => {
  for (let i = 0; i < 5; i++) await act(async () => await Promise.resolve());
};
const key = (el: Element, k: string) =>
  act(() => {
    el.dispatchEvent(new KeyboardEvent("keydown", { key: k, bubbles: true, cancelable: true }));
  });
const rows = (tier: string) => [...document.querySelectorAll(`[data-tiered-tier="${tier}"] [data-tiered-row]`)].map((e) => e.textContent);

function draw(segment: TieredSegment, loadChildren?: (item: TieredItem) => Promise<readonly TieredItem[]>) {
  act(() => root.render(<TieredBreadcrumb segments={[segment]} loadChildren={loadChildren} />));
  return host.querySelector(`[data-tiered-segment="${segment.id}"]`) as HTMLElement;
}

async function openSegment(trigger: HTMLElement) {
  trigger.focus();
  await key(trigger, "Enter");
  await flush();
}

describe("tier 1 — a segment opens its siblings", () => {
  it("shows five, keeps the current page, says how many more, and searches all of them", async () => {
    const siblings = jest.fn(async () => ({ heading: "Other pages in Client Hub", items: CLIENTS.map(page) }));
    const trigger = draw({ id: "seg", label: "Harbor Dental", href: "/spaces/p0", siblings });
    await openSegment(trigger);

    expect(document.body.textContent).toContain("Other pages in Client Hub");
    expect(rows("1")).toEqual(CLIENTS.slice(0, 5));
    const more = document.querySelector("[data-tiered-more]") as HTMLElement;
    expect(more.textContent).toContain("2 more");

    await act(async () => more.click());
    await flush();
    expect(rows("1")).toEqual(CLIENTS);
    const search = document.querySelector('[data-tiered-tier="1"] input') as HTMLInputElement;
    expect(search).toBeTruthy();
    await act(async () => {
      const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      set.call(search, "sal");
      search.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(rows("1")).toEqual(["Saltwater Cafe"]);

    // Closed and opened again: the siblings are not read a second time.
    await key(document.activeElement ?? document.body, "Escape");
    await openSegment(trigger);
    expect(siblings).toHaveBeenCalledTimes(1);
  });

  it("keeps the current page in view when it sits past the first five", () => {
    const items = CLIENTS.map((label, i) => ({ ...page(label, i), current: label === "Saltwater Cafe" }));
    const { shown, more } = capSiblings(items);
    expect(shown.map((s) => s.label)).toEqual(["Harbor Dental", "Northline Fitness", "Copperline Bakery", "Westgate Law", "Saltwater Cafe"]);
    expect(more).toBe(2);
    expect(filterItems(items, "  north  fit ").map((s) => s.label)).toEqual(["Northline Fitness"]);
  });
});

describe("tier 2 — a page opens what it holds", () => {
  it("reads a page's databases once, when its submenu first opens, and draws them", async () => {
    const loadChildren = jest.fn(async (item: TieredItem) => [
      { id: `${item.id}:pay`, label: "View of Payments", href: `${item.href}#block-pay`, children: [] },
      { id: `${item.id}:proj`, label: "View of Projects", href: `${item.href}#block-proj`, children: [] },
    ]);
    const trigger = draw({ id: "seg", label: "Harbor Dental", href: "/spaces/p0", siblings: async () => ({ heading: "Other pages", items: CLIENTS.slice(0, 3).map(page) }) }, loadChildren);
    await openSegment(trigger);
    expect(loadChildren).not.toHaveBeenCalled();

    const northline = document.querySelector('[data-tiered-tier="1"] [data-tiered-row="p1"]') as HTMLElement;
    northline.focus();
    await key(northline, "ArrowRight");
    await flush();
    expect(loadChildren).toHaveBeenCalledTimes(1);
    expect(loadChildren.mock.calls[0][0].id).toBe("p1");
    expect(rows("2")).toEqual(["View of Payments", "View of Projects"]);

    // Enter on the page row goes to the page itself.
    await key(northline, "Enter");
    expect(push).toHaveBeenCalledWith("/spaces/p1");
  });
});

describe("tier 3 — a database opens its views", () => {
  it("draws the views it already holds with no read, and a view navigates to its page, block and view", async () => {
    const views = [
      { id: "v1", label: "Payments made", href: "/spaces/p1?view=v1#block-pay", expandable: false },
      { id: "v2", label: "All payments", href: "/spaces/p1?view=v2#block-pay", expandable: false },
    ];
    const loadChildren = jest.fn(async (item: TieredItem) => [{ id: `${item.id}:pay`, label: "View of Payments", href: `${item.href}#block-pay`, children: views }]);
    const trigger = draw({ id: "seg", label: "Harbor Dental", href: "/spaces/p0", siblings: async () => ({ heading: "Other pages", items: [page("Northline Fitness", 1)] }) }, loadChildren);
    await openSegment(trigger);
    const northline = document.querySelector('[data-tiered-row="p1"]') as HTMLElement;
    northline.focus();
    await key(northline, "ArrowRight");
    await flush();
    const payments = document.querySelector('[data-tiered-tier="2"] [data-tiered-row="p1:pay"]') as HTMLElement;
    payments.focus();
    await key(payments, "ArrowRight");
    await flush();
    expect(rows("3")).toEqual(["Payments made", "All payments"]);
    expect(loadChildren).toHaveBeenCalledTimes(1);

    const allPayments = document.querySelector('[data-tiered-tier="3"] [data-tiered-row="v2"]') as HTMLElement;
    await act(async () => allPayments.click());
    expect(push).toHaveBeenCalledWith("/spaces/p1?view=v2#block-pay");
  });
});
