/**
 * EVERY CRUMB IS A DOOR (Arman, 2026-10-22): "[Marketing LOGO] > Brands v > Vasaro v [STAR] …" —
 * the product icon lists every product (+ a search), the first level lists the product's first-tier
 * places (+ a search over everything), a record lists its siblings. The crumb's text stays a link.
 */
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Building2, Megaphone, Notebook } from "lucide-react";
import { SheetHeader } from "../SheetHeader";
import { crumbDoorOf, filterDoorRows } from "../CrumbDoor";
import { pageTrailCrumbs } from "@/features/shell/frame-host/framePageHeader";
import type { FrameCrumb, FrameProduct } from "../types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const MARKETING: FrameProduct = {
  id: "marketing",
  name: "Marketing",
  family: "business",
  icon: Megaphone,
  color: "blue",
  homeHref: "/marketing",
  menu: [
    {
      id: "main",
      items: [
        { id: "brands", label: "Brands", icon: Building2, href: "/marketing/brands" },
        { id: "reports", label: "Reports", icon: Notebook, href: "/marketing/reports" },
      ],
    },
  ],
};
const NOTES: FrameProduct = { ...MARKETING, id: "notes", name: "Notes", icon: Notebook, homeHref: "/notes", menu: [] };
const go = jest.fn();

function trail(): FrameCrumb[] {
  return pageTrailCrumbs(
    MARKETING,
    [
      { label: "Marketing", href: "/marketing", at: "/marketing" },
      { label: "Brands", href: "/marketing/brands", at: "/marketing/brands" },
      {
        label: "Vasaro",
        href: "/marketing/brands/vasaro",
        options: [
          { label: "Vasaro", href: "/marketing/brands/vasaro", active: true },
          { label: "Acme", href: "/marketing/brands/acme" },
        ],
        optionsLabel: "Brands",
      },
    ],
    go,
    { products: [MARKETING, NOTES] },
  );
}

describe("crumb doors — the contract", () => {
  it("product icon = products door, first level = places door, record = siblings door", () => {
    const [product, brands, record] = trail();
    expect(product!.door?.kind).toBe("products");
    expect(product!.door?.newTab).toBe(true);
    expect(product!.door?.options?.map((o) => [o.label, Boolean(o.active)])).toEqual([
      ["Marketing", true],
      ["Notes", false],
    ]);
    expect(brands!.label).toBe("Brands");
    expect(brands!.door?.kind).toBe("places");
    expect(brands!.door?.options?.map((o) => [o.label, Boolean(o.active)])).toEqual([
      ["Brands", true],
      ["Reports", false],
    ]);
    expect(crumbDoorOf(record!)?.kind).toBe("siblings");
    expect(crumbDoorOf(record!)?.options?.map((o) => o.label)).toEqual(["Vasaro", "Acme"]);
  });

  it("without door sources the trail is as before (classic hosts, the lab)", () => {
    const crumbs = pageTrailCrumbs(MARKETING, [{ label: "Brands", href: "/marketing/brands" }, { label: "Vasaro" }], go);
    expect(crumbs.every((c) => c.door == null)).toBe(true);
  });

  it("a door's search filters its rows by words", () => {
    const rows = [
      { label: "Vasaro Wines", href: "/a" },
      { label: "Acme Corp", href: "/b" },
    ];
    expect(filterDoorRows(rows, "acme").map((r) => r.label)).toEqual(["Acme Corp"]);
    expect(filterDoorRows(rows, "").map((r) => r.label)).toEqual(["Vasaro Wines", "Acme Corp"]);
  });
});

describe("crumb doors — in the header", () => {
  function mount(crumbs: FrameCrumb[]) {
    const el = document.createElement("div");
    document.body.appendChild(el);
    const root = createRoot(el);
    act(() => {
      root.render(<SheetHeader form="desktop" crumbs={crumbs} actions={[]} onOpenDrawer={() => {}} />);
    });
    return { el, unmount: () => act(() => root.unmount()) };
  }

  it("every level above the page is a link, and every level with a level carries a door", () => {
    const { el, unmount } = mount(trail());
    const nav = el.querySelector('nav[aria-label="Breadcrumb"]')!;
    expect(nav.querySelector('a[href="/marketing/brands"]')?.textContent).toBe("Brands");
    expect(nav.querySelector('[data-crumb-door="products"]')).not.toBeNull();
    expect(nav.querySelector('[data-crumb-door="places"]')).not.toBeNull();
    expect(nav.querySelector('[data-crumb-door="siblings"]')).not.toBeNull();
    unmount();
  });

  it("opening the record's door shows a search and its siblings", () => {
    const { el, unmount } = mount(trail());
    const trigger = el.querySelector<HTMLButtonElement>('[data-crumb-door="siblings"]')!;
    act(() => {
      trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0 }));
      trigger.click();
    });
    const panel = document.querySelector('[data-crumb-door-panel="siblings"]');
    expect(panel).not.toBeNull();
    expect(panel!.querySelector('input[aria-label="Search Brands"]')).not.toBeNull();
    const rows = [...panel!.querySelectorAll("[data-crumb-door-row]")].map((r) => r.textContent);
    expect(rows).toEqual(["Vasaro", "Acme"]);
    unmount();
  });
});
