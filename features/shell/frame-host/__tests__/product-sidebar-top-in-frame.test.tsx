/**
 * THE TOP OF EVERY PRODUCT SIDEBAR (Arman, 2026-10-22): in the frame every product's sidebar opens
 * with Search, a few chosen related places and "More" (every other place + "Edit sidebar…"), with
 * layered defaults (system → organization → person, knob `shell.sidebar.places`). The product's own
 * body sits below. /chat's menu draws its own top: the frame draws no second one.
 *
 * PROVEN FAILING BEFORE PASSING: before this change the frame sidebar had no top at all (only the
 * "product rows" strip above a module menu), so no product offered its related places or More.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MessageCircle } from "lucide-react";
import { AppFrame } from "@/features/shell/frame/AppFrame";
import { PRODUCTS, PRODUCT_FAMILIES } from "@/features/shell/frame/products";
import {
  DEFAULT_PLACES_ABOVE_MORE,
  PAGE_PLACES,
  RELATED_PLACES,
  chosenPlacesAboveMore,
} from "@/features/shell/frame/relatedPlaces";
import { FrameSidebarSlotContext } from "../frameSidebarSlot";
import { useFrameProductSidebar } from "../frameProductSidebar";
import { FrameProductTop, resolveRelatedPlaces } from "../FrameProductTop";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

jest.mock("@/features/shell/constants/route-menu-loaders", () => {
  const menu = (name: string) => () =>
    Promise.resolve({
      default: () => <ul data-testid={`menu-${name}`} />,
    });
  return {
    loadSettingsRouteMenu: menu("settings"),
    loadAgentRunSidebarMenu: menu("agent-runs"),
    loadAdminRouteSidebarMenu: menu("admin"),
    loadChatSidebarMenu: menu("chat"),
    loadChatConversationSidebarMenu: menu("chat"),
    loadStaffSidebarMenu: menu("staff"),
    loadCodeSidebarMenu: menu("code"),
    loadMarketingSidebarMenu: menu("marketing"),
    loadResearchTopicSidebarMenu: menu("research"),
    loadImagesSidebarMenu: menu("images"),
  };
});

// The session: a signed-in person in an organization, and the knob's effective map.
let mockKnob: unknown = undefined;
jest.mock("@/lib/scoped-config/sessionKnob", () => ({ useSessionKnob: () => mockKnob }));
jest.mock("@/lib/redux/hooks", () => ({
  useAppSelector: (pick: (s: unknown) => unknown) =>
    pick({ appContext: { organization_id: "org-1" }, userAuth: { id: "user-1" } }),
}));
const mockSetEntry = jest.fn();
jest.mock("@/lib/scoped-config/service", () => ({
  setUserKnobMapEntry: (...args: unknown[]) => mockSetEntry(...args),
}));
jest.mock("@/lib/scoped-config/effectiveKnobs", () => ({ invalidateEffectiveKnob: jest.fn() }));
jest.mock("@/lib/toast", () => ({ toast: { error: jest.fn() } }));
jest.mock("@ai-matrx/kit/media-query", () => ({
  ...jest.requireActual("@ai-matrx/kit/media-query"),
  useIsMobile: () => false,
}));

class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= NoopResizeObserver;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

const productFor = (id: string) => PRODUCTS.find((p) => p.id === id)!;
let host: HTMLElement;
let root: Root;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
  mockKnob = undefined;
  mockSetEntry.mockReset();
});

/** FrameHostImpl's composition: the product sidebar hook, the top unless the body owns one. */
function FrameHost({ pathname, productId }: { pathname: string; productId: string }) {
  const product = productFor(productId);
  const { slotHost, sidebarContent, productRows, ownsTop } = useFrameProductSidebar(pathname, <MessageCircle aria-hidden />);
  return (
    <AppFrame
      products={PRODUCTS}
      families={PRODUCT_FAMILIES}
      product={product}
      favorites={[]}
      onFavoritesChange={() => {}}
      crumbs={[{ id: "p", label: product.name }]}
      actions={[]}
      variant="workspace"
      form="desktop"
      sidebarContent={sidebarContent}
      sidebarTop={
        ownsTop ? undefined : (
          <FrameProductTop
            product={product}
            products={PRODUCTS}
            ownPagesInMore={sidebarContent != null && productRows}
            onGo={() => {}}
          />
        )
      }
    >
      <main>
        <FrameSidebarSlotContext value={slotHost}>
          <p>Page</p>
        </FrameSidebarSlotContext>
      </main>
    </AppFrame>
  );
}

async function mount(node: React.ReactNode) {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  await act(async () => {
    root.render(node);
  });
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

const top = () => host.querySelector<HTMLElement>('[data-mf-region="product-top"]');
const aboveMore = () =>
  Array.from(top()!.querySelectorAll("[data-sidebar-place]")).map((el) => el.getAttribute("data-sidebar-place"));
async function openMore() {
  const trigger = top()!.querySelector<HTMLElement>("[data-sidebar-more-trigger]")!;
  await act(async () => {
    trigger.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, cancelable: true, button: 0, ctrlKey: false }));
  });
  return document.querySelector<HTMLElement>('[role="menu"]')!;
}
const menuItems = (menu: HTMLElement) => Array.from(menu.querySelectorAll('[role="menuitem"]')).map((n) => n.textContent);

describe("every product sidebar opens with its related places and More", () => {
  it("CRM: its first declared places above More, the rest and Edit sidebar… inside More", async () => {
    await mount(<FrameHost pathname="/crm" productId="crm" />);
    expect(top()).not.toBeNull();
    expect(aboveMore()).toEqual(RELATED_PLACES.crm!.slice(0, DEFAULT_PLACES_ABOVE_MORE));
    const menu = await openMore();
    const items = menuItems(menu);
    expect(items).toContain("Data");
    expect(items).toContain("Home");
    expect(items[items.length - 1]).toBe("Edit sidebar…");
    // The body is CRM's own rows: its pages are not repeated in More.
    expect(menu.querySelector('[role="group"]')).toBeNull();
  });

  it("over a module's own menu (Marketing) the product's own pages sit in More under its name: nothing is lost", async () => {
    await mount(<FrameHost pathname="/marketing/brands" productId="marketing" />);
    expect(host.querySelector('[data-testid="menu-marketing"]')).not.toBeNull();
    const menu = await openMore();
    const group = menu.querySelector<HTMLElement>('[role="group"][aria-label="Marketing"]');
    expect(group).not.toBeNull();
    const own = productFor("marketing").menu.flatMap((s) => s.items.map((i) => i.label));
    expect(menuItems(group!)).toEqual(own);
  });

  it("a saved choice (organization or person rung) replaces the default for that product only", async () => {
    mockKnob = { crm: ["data", "meet"], notes: ["x"] };
    await mount(<FrameHost pathname="/crm" productId="crm" />);
    expect(aboveMore()).toEqual(["data", "meet"]);
    expect(chosenPlacesAboveMore("marketing", mockKnob)).toEqual(RELATED_PLACES.marketing!.slice(0, 3));
  });

  it("Edit sidebar… saves the person's own choice for this product through the knob's map door", async () => {
    mockSetEntry.mockResolvedValue({ ok: true, map: {}, changed: true });
    await mount(<FrameHost pathname="/crm" productId="crm" />);
    const menu = await openMore();
    const edit = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]')).find((n) => n.textContent === "Edit sidebar…")!;
    await act(async () => edit.click());
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.textContent).toContain("Above More");
    // Untick Marketing (first), tick Home (last).
    const boxes = Array.from(dialog.querySelectorAll<HTMLElement>('[role="checkbox"]'));
    await act(async () => boxes[0]!.click());
    await act(async () => boxes[boxes.length - 1]!.click());
    const save = Array.from(dialog.querySelectorAll<HTMLButtonElement>("button")).find((b) => b.textContent === "Save as my default")!;
    await act(async () => save.click());
    expect(mockSetEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        feature: "shell.sidebar",
        key: "places",
        entryKey: "crm",
        entryValue: ["messages", "meet", "home"],
        userId: "user-1",
        organizationId: "org-1",
      }),
    );
    expect(aboveMore()).toEqual(["messages", "meet", "home"]);
  });

  it("/chat: the chat menu draws its own top, so the frame draws none (one top)", async () => {
    await mount(<FrameHost pathname="/chat/new" productId="chat" />);
    expect(host.querySelector('[data-testid="menu-chat"]')).not.toBeNull();
    expect(top()).toBeNull();
    expect(host.querySelectorAll("[data-product-sidebar-top]")).toHaveLength(0);
  });
});

describe("the declared lists", () => {
  it("every product declares related places, and every declared place resolves to a live place", () => {
    for (const product of PRODUCTS) {
      const refs = RELATED_PLACES[product.id];
      expect(refs?.length ?? 0).toBeGreaterThanOrEqual(DEFAULT_PLACES_ABOVE_MORE);
      const resolved = resolveRelatedPlaces(product, PRODUCTS).map((p) => p.id);
      expect(resolved).toEqual(refs!.filter((r) => r !== product.id));
      for (const ref of refs!) {
        if (ref.startsWith("page:")) expect(PAGE_PLACES[ref.slice(5) as keyof typeof PAGE_PLACES]).toBeDefined();
        else expect(PRODUCTS.some((p) => p.id === ref)).toBe(true);
      }
    }
  });
});
