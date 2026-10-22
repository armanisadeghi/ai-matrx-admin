/**
 * PINNED STARTS FULL, EDITS IN PLACE (Arman, 2026-10-22): "start them with... Chat, Intelligence and
 * Memory on the first row. Then, workspace and tools and the last spot empty with a dashed line",
 * plus "an edit icon to the right side of it so the user can click and easily edit what is there".
 *   1. the starting set renders in that order, three per row, then one dashed slot;
 *   2. the pencil opens the editor; the dashed slot opens it to add;
 *   3. a saved choice reaches the host (which saves it per person) in the new order;
 *   4. Pinned is the ONE always-visible list: the "big items" list is gone.
 *
 * PROVEN FAILING BEFORE PASSING: before this change Pinned was a one-line list with the hint
 * "Star a page to pin it here", no edit icon, no starting set, and a second "big items" list.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AppFrame, type AppFrameProps } from "../AppFrame";
import { PINNED_ADD_LABEL, PINNED_EDIT_LABEL } from "../FrameSidebar";
import { DEFAULT_PINNED_PRODUCTS, PRODUCTS, PRODUCT_FAMILIES, defaultPins } from "../products";
import type { FramePin } from "../types";
import { savePinsTo } from "@/features/shell/frame-host/useFramePins";

jest.mock("@/components/favorites/usePinned", () => ({ usePinned: jest.fn() }));
jest.mock("@/features/shell/current-record/currentRecord", () => ({ useCurrentRecord: () => null }));
jest.mock("@/lib/redux/hooks", () => ({ useAppSelector: () => "loaded" }));

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
const pinned = () => sidebar().querySelector<HTMLElement>('[data-mf-region="pinned"]');
const tiles = () => Array.from(pinned()!.querySelectorAll("[data-mf-pin]")).map((el) => el.getAttribute("data-mf-pin"));
const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');
const button = (root: ParentNode, label: string) =>
  Array.from(root.querySelectorAll<HTMLButtonElement>("button")).find(
    (b) => b.getAttribute("aria-label") === label || b.textContent === label,
  )!;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

describe("Pinned", () => {
  it("starts with Chat, Intelligence, Memory / Workspace, Tools, then one dashed slot, three per row", () => {
    mount({ pins: defaultPins(PRODUCTS), onPinsChange: () => {} });
    expect(DEFAULT_PINNED_PRODUCTS).toEqual(["chat", "intelligence", "memory", "workspace", "business-tools"]);
    expect(tiles()).toEqual(["chat", "intelligence", "memory", "workspace", "business-tools"]);
    const grid = pinned()!.querySelector("[data-mf-pinned-grid]")!;
    expect(grid.className).toContain("grid-cols-3");
    // The sixth spot: the dashed empty slot, last.
    const items = Array.from(grid.children);
    expect(items).toHaveLength(6);
    expect(items[5]!.querySelector("[data-mf-pin-slot]")).not.toBeNull();
    // Short names: "Tools", not "Business Tools".
    expect(pinned()!.textContent).toContain("Tools");
    expect(pinned()!.textContent).not.toContain("Business Tools");
    // Every tile opens a new tab.
    for (const a of Array.from(pinned()!.querySelectorAll("a"))) expect(a.getAttribute("target")).toBe("_blank");
  });

  it("the pencil opens the editor; the dashed slot opens it on Add", () => {
    mount({ pins: defaultPins(PRODUCTS), onPinsChange: () => {} });
    act(() => button(pinned()!, PINNED_EDIT_LABEL).click());
    expect(dialog()?.textContent).toContain("Edit pinned");
    const sections = Array.from(dialog()!.querySelectorAll("section")).map((s) => s.querySelector("span")?.textContent);
    expect(sections).toEqual(["Pinned", "Add"]);
    act(() => button(dialog()!, "Cancel").click());
    act(() => button(pinned()!, PINNED_ADD_LABEL).click());
    const addFirst = Array.from(dialog()!.querySelectorAll("section")).map((s) => s.querySelector("span")?.textContent);
    expect(addFirst).toEqual(["Add", "Pinned"]);
  });

  it("a saved choice reaches the host in the new order", () => {
    const saved: FramePin[][] = [];
    mount({ pins: defaultPins(PRODUCTS), onPinsChange: (next) => saved.push(next) });
    act(() => button(pinned()!, PINNED_EDIT_LABEL).click());
    act(() => button(dialog()!, "Remove Chat").click());
    act(() => button(dialog()!, "Move Memory up").click());
    act(() => button(dialog()!, "Pin CRM").click());
    act(() => button(dialog()!, "Save").click());
    expect(saved).toHaveLength(1);
    expect(saved[0]!.map((p) => p.productId)).toEqual(["memory", "intelligence", "workspace", "business-tools", "crm"]);
  });

  it("without onPinsChange there is no pencil and no dashed slot", () => {
    mount({ pins: defaultPins(PRODUCTS) });
    expect(pinned()!.querySelector("[data-mf-pinned-edit]")).toBeNull();
    expect(pinned()!.querySelector("[data-mf-pin-slot]")).toBeNull();
  });

  it("Pinned is the one always-visible list: no big-items list", () => {
    mount({ pins: defaultPins(PRODUCTS), onPinsChange: () => {} });
    expect(sidebar().querySelector('[data-mf-region="big-items"]')).toBeNull();
  });
});

describe("the sidebar's top row (owner, 2026-10-22: do not list the product there)", () => {
  it("has the grid, Go to and collapse, never the product's name", () => {
    mount({ product: PRODUCTS.find((p) => p.id === "marketing")!, pins: defaultPins(PRODUCTS) });
    const row = sidebar().querySelector<HTMLElement>('[data-mf-region="sidebar-top-row"]')!;
    expect(row.textContent).not.toContain("Marketing");
    expect(row.querySelector("[data-mf-mark]")).toBeNull();
    expect(row.querySelector("[data-go-to-trigger]")).not.toBeNull();
  });
});

describe("saving through the one favourites store", () => {
  it("unpins the removed, pins the new as page favourites, then saves the order", () => {
    const calls: string[] = [];
    const store = {
      favorites: [
        { id: "/notes", kind: "nav" as const, label: "Notes", href: "/notes", pinnedAt: "t" },
        { id: "/crm", kind: "nav" as const, label: "CRM", href: "/crm", pinnedAt: "t" },
      ],
      pin: (item: { id: string }) => calls.push(`pin ${item.id}`),
      unpin: (id: string) => calls.push(`unpin ${id}`),
      reorder: (ids: string[]) => calls.push(`order ${ids.join(",")}`),
    };
    savePinsTo(store, [
      { id: "/crm", label: "CRM", href: "/crm" },
      { id: "/chat", label: "Chat", href: "/chat", productId: "chat" },
    ]);
    expect(calls).toEqual(["unpin /notes", "pin /chat", "order /crm,/chat"]);
  });
});
