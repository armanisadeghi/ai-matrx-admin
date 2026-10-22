/**
 * THE PAGE HANDS ITS CRUMBS TO THE FRAME (owner, 2026-10-22: the new header is enforced in frame
 * mode). In the new app frame a page-top template (RecordPageHeader here) used to draw its own
 * title row in the header slot beside the frame's route-table crumbs, so the title showed twice
 * and the frame's trail was a guess. Now the template declares its real trail to the frame and
 * keeps only its modes and actions in the slot. Classic (no frame host) draws exactly as before.
 *
 * PROVEN FAILING BEFORE PASSING: against the pre-change templates the record name appears twice in
 * frame mode and the frame's crumbs are the route table's ("Route title"), not the page's.
 */
import React, { act } from "react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createRoot, type Root } from "react-dom/client";
import { Archive, Pencil, Tag, Trash2 } from "lucide-react";
import type { FrameProduct } from "@/features/shell/frame/types";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let mockMobile = false;
jest.mock("@ai-matrx/kit/media-query", () => ({ ...jest.requireActual("@ai-matrx/kit/media-query"), useIsMobile: () => mockMobile }));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => "/marketing/brands/b1",
}));
jest.mock("@/lib/navigation/useBackHref", () => ({ useBackHref: (h: string) => h }));
// The header slot renders where it stands (the portal machinery has its own tests).
jest.mock("@/features/shell/components/header/PageHeader", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="page-header">{children}</div>,
}));
// The page's REAL trail: what the address + menu derive for this record page.
const RECORD_TRAIL = [
  { label: "Marketing", href: "/marketing" },
  { label: "Brands", href: "/marketing/brands" },
  { label: "Acme Coffee" },
];
let mockDerived: unknown[] = RECORD_TRAIL;
jest.mock("@/features/shell/breadcrumbs/useDerivedTrail", () => ({
  useDerivedTrail: () => mockDerived,
}));

class RO {
  observe() {}
  disconnect() {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver = RO;

/* eslint-disable @typescript-eslint/no-require-imports */
const { TooltipProvider } = require("@/components/ui/tooltip") as typeof import("@/components/ui/tooltip");
const { RecordPageHeader } = require("@/features/shell/components/header/templates/RecordPageHeader") as typeof import("@/features/shell/components/header/templates/RecordPageHeader");
const { SheetHeader } = require("@/features/shell/frame/SheetHeader") as typeof import("@/features/shell/frame/SheetHeader");
const page = require("../framePageHeader") as typeof import("../framePageHeader");
/* eslint-enable @typescript-eslint/no-require-imports */

const product: FrameProduct = {
  id: "marketing",
  name: "Marketing",
  family: "business",
  icon: Tag,
  color: "blue",
  homeHref: "/marketing",
  menu: [],
};
/** What the address derives when no page declared a trail (the host's `useDerivedTrail`). */
const ADDRESS_TRAIL = [
  { label: "Marketing", href: "/marketing" },
  { label: "Brands", href: "/marketing/brands" },
  { label: "Address title" },
];

function Record() {
  return (
    <RecordPageHeader
      backHref="/marketing/brands"
      record={{ name: "Acme Coffee" }}
      modes={[
        { name: "Overview", href: "/marketing/brands/b1" },
        { name: "Settings", href: "/marketing/brands/b1/settings" },
      ]}
      actions={[{ label: "Rename", icon: Pencil, onPress: () => {} }]}
    />
  );
}

/** What FrameHostImpl does: ONE derivation — the page's declared trail, else the address's. */
function FrameHarness({ children }: { children: React.ReactNode }) {
  const { host, pageCrumbs } = page.useFramePageHeaderHost();
  const crumbs = page.frameHostCrumbs(product, pageCrumbs, ADDRESS_TRAIL, () => {});
  return (
    <page.FramePageHeaderContext value={host}>
      <SheetHeader form="desktop" crumbs={crumbs} actions={[]} hostSlots onOpenDrawer={() => {}} />
      {children}
    </page.FramePageHeaderContext>
  );
}

let root: Root | undefined;
let el: HTMLElement;
function mount(node: React.ReactNode) {
  el = document.createElement("div");
  document.body.appendChild(el);
  const r = createRoot(el);
  root = r;
  act(() => r.render(<TooltipProvider>{node}</TooltipProvider>));
}
afterEach(() => {
  if (root) act(() => root!.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

const occurrences = (text: string) =>
  [...el.querySelectorAll("*")].filter((n) => n.children.length === 0 && n.textContent?.trim() === text).length;

describe("page-top templates in the new app frame", () => {
  it("frame crumbs: never the same level twice (product root, a list named like its section)", () => {
    const labels = page
      .pageTrailCrumbs(product, [{ label: "Marketing", href: "/marketing" }, { label: "Brands", href: "/marketing/brands" }, { label: "Brands" }], () => {})
      .map((c) => c.label);
    expect(labels).toEqual(["Marketing", "Brands"]);
  });

  it("frame: the record's name shows ONCE, as the frame's last crumb; the trail is the page's", () => {
    mount(
      <FrameHarness>
        <Record />
      </FrameHarness>,
    );
    expect(occurrences("Acme Coffee")).toBe(1);
    const frameCrumbs = el.querySelector("[data-frame-crumbs]") as HTMLElement;
    expect(frameCrumbs.querySelector("h1")?.textContent).toBe("Acme Coffee");
    expect(frameCrumbs.textContent).toContain("Brands");
    expect(frameCrumbs.textContent).not.toContain("Address title");
    // The page's root level repeated the product: it is dropped, never shown twice.
    expect(frameCrumbs.querySelectorAll('a[href="/marketing"]')).toHaveLength(1);
    // The template's own row keeps its modes and actions, and no trail, name or back button.
    const slot = el.querySelector('[data-testid="page-header"]') as HTMLElement;
    expect(slot.querySelector("[data-entity-trail]")).toBeNull();
    expect(slot.querySelector('[aria-label="Back"]')).toBeNull();
    expect(slot.textContent).toContain("Settings");
    expect(slot.querySelector('[aria-label="Rename"]')).not.toBeNull();
  });

  it("frame: the crumbs fall back to the address-derived trail once the page's header is gone", () => {
    function Toggle({ on }: { on: boolean }) {
      return <FrameHarness>{on ? <Record /> : null}</FrameHarness>;
    }
    mount(<Toggle on />);
    act(() => root!.render(<TooltipProvider><Toggle on={false} /></TooltipProvider>));
    const frameCrumbs = el.querySelector("[data-frame-crumbs]") as HTMLElement;
    expect(frameCrumbs.querySelector("h1")?.textContent).toBe("Address title");
    // Same shape as a declared trail: the product root is not repeated, the middle level links.
    expect(frameCrumbs.querySelectorAll('a[href="/marketing"]')).toHaveLength(1);
    expect(frameCrumbs.querySelector('a[href="/marketing/brands"]')?.textContent).toContain("Brands");
  });

  it("the host has ONE crumb derivation (no route-table crumbs beside the derived trail)", () => {
    const src = readFileSync(join(__dirname, "../FrameHostImpl.tsx"), "utf8");
    expect(src).toMatch(/frameHostCrumbs\(product, pageCrumbs, useDerivedTrail\(/);
    expect(src).not.toMatch(/derivedCrumbs|pageTrailCrumbs/);
  });

  describe("a LEVEL (a list, no id): its crumb's door is the derived trail's siblings", () => {
    const LEVEL_TRAIL = [
      { label: "Marketing", href: "/marketing" },
      {
        label: "Brands",
        options: [
          { label: "Brands", href: "/marketing/brands", active: true },
          { label: "Reports", href: "/marketing/reports" },
        ],
      },
    ];
    beforeEach(() => {
      mockDerived = LEVEL_TRAIL;
    });
    afterEach(() => {
      mockDerived = RECORD_TRAIL;
    });

    it("classic: the level's name opens a sibling door", () => {
      mount(<RecordPageHeader level={{ name: "Brands" }} />);
      const slot = el.querySelector('[data-testid="page-header"]') as HTMLElement;
      expect(slot.querySelector("[data-crumb-door]")).not.toBeNull();
    });

    it("frame: the level's crumb carries the derived siblings", () => {
      mount(
        <FrameHarness>
          <RecordPageHeader level={{ name: "Brands" }} />
        </FrameHarness>,
      );
      const frameCrumbs = el.querySelector("[data-frame-crumbs]") as HTMLElement;
      expect(frameCrumbs.querySelector("h1")?.textContent).toBe("Brands");
      expect(frameCrumbs.querySelector('[data-crumb-door="siblings"]')).not.toBeNull();
    });

    it("a record never borrows the level's siblings", () => {
      mount(<RecordPageHeader record={{ name: "Brands" }} />);
      const slot = el.querySelector('[data-testid="page-header"]') as HTMLElement;
      expect(slot.querySelector("[data-crumb-door]")).toBeNull();
    });
  });

  it("classic: the template draws its own back, trail and name, as before", () => {
    mount(<Record />);
    const slot = el.querySelector('[data-testid="page-header"]') as HTMLElement;
    expect(slot.querySelector('[aria-label="Back"]')).not.toBeNull();
    expect(slot.querySelector("[data-entity-trail]")?.textContent).toContain("Brands");
    expect(occurrences("Acme Coffee")).toBe(1);
    expect(slot.querySelector('[aria-label="Rename"]')).not.toBeNull();
  });
});

/** The frame's "…" as the host merges it: the page's declared items, then the frame's defaults. */
function ActionsHarness({ children }: { children: React.ReactNode }) {
  const { host, pageActions } = page.useFramePageHeaderHost();
  return (
    <page.FramePageHeaderContext value={host}>
      <ul data-testid="frame-menu">
        {pageActions.map((a) => (
          <li key={a.id} data-destructive={a.destructive ? "" : undefined}>
            <button type="button" onClick={a.onSelect}>{a.label}</button>
          </li>
        ))}
      </ul>
      {children}
    </page.FramePageHeaderContext>
  );
}

describe("pages add their own \"…\" items in the frame (adversarial review, 2026-10-22)", () => {
  afterEach(() => {
    mockMobile = false;
  });
  const archive = jest.fn();
  function WithMenu() {
    return (
      <RecordPageHeader
        backHref="/marketing/brands"
        record={{ name: "Acme Coffee" }}
        modes={[
          { name: "Overview", href: "/marketing/brands/b1" },
          { name: "Settings", href: "/marketing/brands/b1/settings" },
        ]}
        actions={[{ label: "Rename", icon: Pencil, onPress: () => {} }]}
        menu={{
          items: [
            { id: "archive", label: "Archive", icon: Archive, onPress: archive },
            { id: "delete", label: "Delete", icon: Trash2, onPress: () => {}, destructive: true },
          ],
        }}
      />
    );
  }
  const menuLabels = () => [...el.querySelectorAll('[data-testid="frame-menu"] button')].map((b) => b.textContent);

  it("desktop: the record's Actions menu becomes the frame's \"…\" items; no second menu on the line", () => {
    mount(<ActionsHarness><WithMenu /></ActionsHarness>);
    // "…" HOLDS EVERY ACTION OF ITS LEVEL (2026-10-22): the line's button (Rename) is in "…" too —
    // ONE action list, two renderings. Before: ["Archive", "Delete"] (Rename only on the line).
    expect([...menuLabels()].sort()).toEqual(["Archive", "Delete", "Rename"]);
    expect(el.querySelector('[data-testid="page-header"]')?.textContent ?? "").not.toContain("Actions");
    expect(el.querySelector('[data-testid="frame-menu"] [data-destructive]')?.textContent).toBe("Delete");
    const slot = el.querySelector('[data-testid="page-header"]') as HTMLElement;
    expect(slot.textContent).not.toContain("Actions");
    // A press runs the page's own handler.
    const archiveButton = [...el.querySelectorAll<HTMLButtonElement>('[data-testid="frame-menu"] button')].find((b) => b.textContent === "Archive")!;
    act(() => archiveButton.click());
    expect(archive).toHaveBeenCalledTimes(1);
  });

  it("phone: the other modes and the actions join the frame's \"…\"; the header draws no \"…\" of its own", () => {
    mockMobile = true;
    mount(<ActionsHarness><WithMenu /></ActionsHarness>);
    expect(menuLabels()).toEqual(expect.arrayContaining(["Settings", "Rename", "Archive", "Delete"]));
    expect(menuLabels()).not.toContain("Overview");
    expect(el.querySelector('[data-testid="page-header"] [aria-label="More"]')).toBeNull();
  });

  it("a header mounted twice (compact + full layout, both live) lists each action ONCE in \"…\"", () => {
    function Twice() {
      page.useDeclareFrameActions([{ id: "agent:delete", label: "Delete", onSelect: () => {} }]);
      return null;
    }
    mount(<ActionsHarness><Twice /><Twice /></ActionsHarness>);
    expect(menuLabels()).toEqual(["Delete"]);
  });

  it("classic: nothing is declared and the Actions menu stays on the line", () => {
    mount(<WithMenu />);
    const slot = el.querySelector('[data-testid="page-header"]') as HTMLElement;
    expect(slot.textContent).toContain("Actions");
  });

  // A menu-placed action (placement: "menu") is in the ONE action list, never a `right=` control.
  function WithMenuPlaced() {
    return (
      <RecordPageHeader
        backHref="/marketing/brands"
        record={{ name: "Acme Coffee" }}
        actions={[
          { label: "Rename", icon: Pencil, onPress: () => {} },
          { label: "Archive", icon: Archive, onPress: archive, placement: "menu" },
        ]}
      />
    );
  }

  it("classic: a menu-placed action is in the line's one Actions menu, not a button", () => {
    mount(<WithMenuPlaced />);
    const slot = el.querySelector('[data-testid="page-header"]') as HTMLElement;
    expect(slot.querySelector('[aria-label="Rename"]')).not.toBeNull();
    expect(slot.querySelector('[aria-label="Archive"]')).toBeNull();
    expect(slot.querySelector('[aria-label="More actions"]')).not.toBeNull();
  });

  it("frame: a menu-placed action is a \"…\" item and no menu is drawn on the line", () => {
    mount(
      <ActionsHarness>
        <WithMenuPlaced />
      </ActionsHarness>,
    );
    expect(menuLabels()).toContain("Archive");
    const slot = el.querySelector('[data-testid="page-header"]') as HTMLElement;
    expect(slot.querySelector('[aria-label="More actions"]')).toBeNull();
    expect(slot.querySelector('[aria-label="Archive"]')).toBeNull();
  });
});
