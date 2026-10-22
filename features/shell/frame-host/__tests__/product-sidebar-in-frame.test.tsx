/**
 * ONE SIDEBAR COLUMN, THE PRODUCT'S OWN NAVIGATION (owner, 2026-10-22). In the new app frame:
 *   A. a Large Route family's registered menu (Chat, Marketing — the menu the classic sidebar flips
 *      into) renders in the frame's sidebar body, in place of the route table's rows;
 *   B. a page that draws its own sidebar (Notes, Files) hands it over through <FrameSidebarContent>:
 *      it renders ONCE, inside the frame's sidebar column, never beside it in the page body;
 *   classic (no frame host) renders the page's sidebar where it stands, unchanged.
 *
 * PROVEN FAILING BEFORE PASSING: before this change the frame had no sidebar content slot — on
 * /chat the sidebar showed only the route table's rows (the chat menu was gone) and a page's own
 * sidebar sat in the page body beside the frame's sidebar (two columns).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MessageCircle } from "lucide-react";
import { AppFrame } from "@/features/shell/frame/AppFrame";
import { PRODUCTS, PRODUCT_FAMILIES } from "@/features/shell/frame/products";
import { routeMenuRegistry } from "@/features/shell/constants/route-menu-registry";
import { FrameSidebarContent, FrameSidebarSlotContext, useFrameSidebarSlot } from "../frameSidebarSlot";
import { frameRouteMenu, useFrameProductSidebar } from "../frameProductSidebar";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The registry's REAL patterns and labels; its loaders resolve to small stand-ins with the
// classic row markup (the real menus need the signed-in app).
jest.mock("@/features/shell/constants/route-menu-loaders", () => {
  const menu = (name: string) => () =>
    Promise.resolve({
      default: ({ expanded }: { expanded: boolean }) => (
        <ul data-testid={`menu-${name}`} data-expanded={String(expanded)}>
          <li className="shell-nav-item">
            <span className="shell-nav-label">{name} menu row</span>
          </li>
        </ul>
      ),
    });
  return {
    loadSettingsRouteMenu: menu("settings"),
    loadAgentRunSidebarMenu: menu("agent-runs"),
    loadAdminRouteSidebarMenu: menu("admin"),
    loadChatSidebarMenu: menu("chat"),
    loadStaffSidebarMenu: menu("staff"),
    loadCodeSidebarMenu: menu("code"),
    loadMarketingSidebarMenu: menu("marketing"),
    loadResearchTopicSidebarMenu: menu("research"),
    loadImagesSidebarMenu: menu("images"),
  };
});

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
});

/** The frame host's composition (FrameHostImpl): the product sidebar hook + the slot around the body. */
function FrameHost({ pathname, productId, page }: { pathname: string; productId: string; page: React.ReactNode }) {
  const product = productFor(productId);
  const { slotHost, sidebarContent } = useFrameProductSidebar(pathname, <MessageCircle aria-hidden />);
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
    >
      <main data-testid="body">
        <FrameSidebarSlotContext value={slotHost}>{page}</FrameSidebarSlotContext>
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
  // The registered menu's chunk (React.lazy) resolves.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

const sidebar = () => host.querySelector<HTMLElement>('[data-mf-region="sidebar"]')!;
const body = () => host.querySelector<HTMLElement>('[data-testid="body"]')!;

describe("kind A: a registered route menu is the frame's sidebar", () => {
  it("resolves Chat and Marketing to their registered menus; pages without one get none", () => {
    expect(frameRouteMenu("/chat/new")?.label).toBe("Chats");
    expect(frameRouteMenu("/chat/abc-123")?.label).toBe("Chats");
    expect(frameRouteMenu("/marketing/brands")?.label).toBe("Marketing");
    expect(frameRouteMenu("/notes")).toBeNull();
    expect(frameRouteMenu("/files/all")).toBeNull();
  });

  it("a family that opens on the main menu (the canvas workspace's chat behind a switch) keeps the rows", () => {
    const canvas = routeMenuRegistry.find((e) => e.defaultView === "main")!;
    expect(canvas.pathPattern.test("/board/b1")).toBe(true);
    expect(frameRouteMenu("/board/b1")).toBeNull();
  });

  it.each([
    ["/chat/new", "chat", "chat"],
    ["/marketing/brands", "marketing", "marketing"],
  ])("%s: the module's menu renders in the frame sidebar, expanded, instead of the route rows", async (pathname, productId, menu) => {
    await mount(<FrameHost pathname={pathname} productId={productId} page={<p>Page</p>} />);
    const nav = sidebar().querySelector('[data-mf-region="product-nav"]');
    expect(nav).not.toBeNull();
    const rendered = nav!.querySelector(`[data-testid="menu-${menu}"]`);
    expect(rendered).not.toBeNull();
    expect(rendered!.getAttribute("data-expanded")).toBe("true");
    // The route table's rows yield: the product's flow menu is not drawn beside the module's.
    const rowLabels = productFor(productId).menu.flatMap((s) => s.items.map((i) => i.label));
    for (const label of rowLabels) expect(sidebar().querySelector(`[title="${label}"]`)).toBeNull();
  });
});

function PageWithOwnSidebar() {
  const inFrame = useFrameSidebarSlot();
  const list = (
    <FrameSidebarContent>
      <div data-testid="page-sidebar">Notes list</div>
    </FrameSidebarContent>
  );
  return inFrame ? (
    <>
      {list}
      <article>Editor</article>
    </>
  ) : (
    <div data-testid="classic-columns">
      <aside data-testid="classic-column">{list}</aside>
      <article>Editor</article>
    </div>
  );
}

describe("kind B: a page's own sidebar goes into the frame's one column", () => {
  it("in the frame it renders once, inside the frame sidebar, and the body has no sidebar column", async () => {
    await mount(<FrameHost pathname="/notes" productId="docs" page={<PageWithOwnSidebar />} />);
    const all = host.querySelectorAll('[data-testid="page-sidebar"]');
    expect(all).toHaveLength(1);
    expect(sidebar().querySelector('[data-mf-region="product-nav"] [data-testid="page-sidebar"]')).not.toBeNull();
    expect(body().querySelector('[data-testid="page-sidebar"]')).toBeNull();
    expect(body().querySelector('[data-testid="classic-column"]')).toBeNull();
  });

  it("the page's sidebar wins over a registered route menu", async () => {
    await mount(<FrameHost pathname="/chat/new" productId="chat" page={<PageWithOwnSidebar />} />);
    expect(sidebar().querySelector('[data-testid="page-sidebar"]')).not.toBeNull();
    expect(sidebar().querySelector('[data-testid="menu-chat"]')).toBeNull();
  });

  it("when the page leaves, the frame's rows come back", async () => {
    function Toggle() {
      const [on, setOn] = React.useState(true);
      return (
        <FrameHost
          pathname="/notes"
          productId="docs"
          page={
            <>
              <button data-testid="leave" onClick={() => setOn(false)} />
              {on ? <PageWithOwnSidebar /> : null}
            </>
          }
        />
      );
    }
    await mount(<Toggle />);
    expect(sidebar().querySelector('[data-mf-page-sidebar]')).not.toBeNull();
    await act(async () => {
      host.querySelector<HTMLButtonElement>('[data-testid="leave"]')!.click();
    });
    expect(sidebar().querySelector('[data-mf-page-sidebar]')).toBeNull();
    expect(sidebar().querySelector('[data-mf-region="product-nav"]')).toBeNull();
  });

  it("classic (no frame host): the page draws its own column, exactly as before", async () => {
    await mount(<PageWithOwnSidebar />);
    expect(host.querySelector('[data-testid="classic-column"] [data-testid="page-sidebar"]')).not.toBeNull();
    expect(host.querySelectorAll('[data-testid="page-sidebar"]')).toHaveLength(1);
  });
});
