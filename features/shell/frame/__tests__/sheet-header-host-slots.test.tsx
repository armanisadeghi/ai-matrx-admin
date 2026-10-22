/**
 * FRAME MODE KEEPS ITS HEADER (2026-10-21, "the breadcrumbs and stuff are missing"): with the
 * host's header slots on, a page's own header content lands in `#frame-header-center` BESIDE the
 * crumb trail, the star and "…" — it never replaces them. The old rule hid the whole derived
 * group (crumbs, star, "…") whenever a page header landed. Classic (no host slots) is unchanged.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { SheetHeader } from "../SheetHeader";
import type { FrameCrumb } from "../types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const crumbs: FrameCrumb[] = [
  { id: "product", label: "Notes", href: "/notes" },
  { id: "page", label: "All notes" },
];
const actions = [{ id: "copy-link", label: "Copy link", onSelect: () => {} }];

function mount(hostSlots: boolean, favorite?: { starred: boolean; onToggle: () => void }) {
  const el = document.createElement("div");
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => {
    root.render(
      <SheetHeader
        form="desktop"
        crumbs={crumbs}
        actions={actions}
        favorite={favorite}
        hostSlots={hostSlots}
        onOpenDrawer={() => {}}
      />,
    );
  });
  return { el, unmount: () => act(() => root.unmount()) };
}

describe("SheetHeader host slots", () => {
  it("keeps crumbs and the menu outside the page's slot, with the slot beside them", () => {
    const { el, unmount } = mount(true, { starred: false, onToggle: () => {} });
    const slot = el.querySelector("#frame-header-center") as HTMLElement;
    expect(slot).not.toBeNull();
    // A page's own header lands in the slot (what PageHeaderPortal does).
    const page = document.createElement("div");
    page.setAttribute("data-page-header-portal", "page");
    slot.appendChild(page);
    const nav = el.querySelector('nav[aria-label="Breadcrumb"]');
    expect(nav).not.toBeNull();
    expect(slot.contains(nav)).toBe(false);
    expect(nav?.closest("[data-frame-derived]")).toBeNull();
    expect(el.querySelector('[aria-label="More actions"]')).not.toBeNull();
    expect(slot.closest("[data-frame-derived]")).toBeNull();
    expect(el.querySelector('[aria-label="Add to favorites"]')).not.toBeNull();
    expect(el.querySelector("#frame-header-right")).not.toBeNull();
    unmount();
  });

  it("classic header is unchanged: crumbs, menu, no slots", () => {
    const { el, unmount } = mount(false);
    expect(el.querySelector('nav[aria-label="Breadcrumb"]')).not.toBeNull();
    expect(el.querySelector('[aria-label="More actions"]')).not.toBeNull();
    expect(el.querySelector("#frame-header-center")).toBeNull();
    expect(el.querySelector("#frame-header-right")).toBeNull();
    unmount();
  });
});
