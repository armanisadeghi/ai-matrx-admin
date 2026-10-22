"use client";

// The new app frame as the live (core) shell — loaded ONLY through FrameHostGate's dynamic(), so
// everything here (AppFrame, the products, the chrome adapter, the route table) is one chunk that
// classic pages never download (`check:shell-eager-graph` blocks it from every eager set).
//
// LAYER 0 (ROLLOUT-PLAN §2): the product, its sidebar row and the default crumbs come from the
// pathname through the GENERATED route table (frame/route-homes.generated.ts) — no page edits.
// LAYER 2: the header carries the page-header slots (`hostHeaderSlots`), so a page's own header
// content lands in the frame and the derived crumbs yield to it.
// The page renders inside a `.shell-main` scroller, the classic page contract (legacy-contracts.css).
//
// SIDE CHAT AND CANVAS (ROLLOUT-PLAN §3): each loads on first open through ONE dynamic import
// (`FrameSideChat`, `FrameCanvas`), then stays mounted. Before that nothing of them is here but
// their state: the side chat's open / closed is the Side Chat's ONE rule and cookie (the light
// `side-chat-state` module — per home, shared with the classic dock), with ⌘\ and the header
// toggle event; the canvas's open / closed is the canvas store's, so `openCanvasItem(...)` from any
// page opens the frame's canvas (the frame presents the canvas window while it is mounted).
import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Copy, ExternalLink, LayoutList } from "lucide-react";
import { copyText } from "@ai-matrx/kit/clipboard";
import { openOutbound } from "@ai-matrx/kit/outbound";
import { selectCanvasIsFullscreen, selectCanvasIsOpen } from "@ai-matrx/canvas";
import {
  useOptionalCanvas,
  useOptionalCanvasState,
} from "@ai-matrx/canvas/react";
import {
  useSideChatOpen,
  useSideChatToggleKeys,
} from "@ai-matrx/chat/canvas/workspace/side-chat-state";
import { FrameChrome } from "./FrameChrome";
import { FrameSideChatHostContext } from "./frameSideChatHost";
import { useEarlySideChatDoors } from "./frameSideChatQueue";
import { useGridFavorites } from "./useGridFavorites";
import {
  FramePageHeaderContext,
  pageTrailCrumbs,
  useFramePageHeaderHost,
} from "./framePageHeader";
import { useFramePins } from "./useFramePins";
import { FrameSidebarSlotContext } from "./frameSidebarSlot";
import { useFrameProductSidebar } from "./frameProductSidebar";
import { menuGoToEntries } from "./goToMenuEntries";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectIsAdminPerson } from "@/lib/redux/selectors/userSelectors";
import type { FrameHostProps } from "./FrameHostGate";
import { PRODUCTS, PRODUCT_FAMILIES } from "@/features/shell/frame/products";
import { FRAME_ROUTE_HOMES } from "@/features/shell/frame/route-homes.generated";
import {
  FRAME_DEFAULT_PRODUCT_ID,
  fillPattern,
  resolveRouteHome,
} from "@/features/shell/frame/routeHomeLookup";
import type {
  FrameAction,
  FrameCrumb,
  FrameMenuItem,
  FrameMenuSection,
  FrameProduct,
} from "@/features/shell/frame/types";

/** /chat and /code carry their own chat: the frame's toggle says so instead of opening a second one. */
export const FRAME_SIDE_CHAT_HOSTED_ELSEWHERE = "This page has its own chat";

/** The frame's heavy modules: each is ONE dynamic import, called only on first open. */
const loadSideChat = () => import("./FrameSideChat");
const loadCanvas = () => import("./FrameCanvas");

const itemId = (index: number) => `r-${index}`;

/** The live products: real entries and sidebars with real links, filled from the current page's params. */
export function liveProducts(params: Record<string, string>): FrameProduct[] {
  return PRODUCTS.map((p) => {
    const home = FRAME_ROUTE_HOMES.products[p.id];
    if (!home || home.items.length === 0) {
      return {
        ...p,
        homeHref: home?.entry ?? p.homeHref,
        menu: [
          {
            id: "main",
            items: [
              {
                id: "home",
                label: p.name,
                icon: p.icon,
                href: home?.entry ?? p.homeHref,
              },
            ],
          },
        ],
      };
    }
    const sections: FrameMenuSection[] = [];
    home.items.forEach(([section, label, pattern, fallback], index) => {
      const item: FrameMenuItem = {
        id: itemId(index),
        label,
        icon: LayoutList,
        href: fillPattern(pattern, params) ?? fallback,
        hint: pattern,
      };
      const last = sections[sections.length - 1];
      if (last && last.id === (section || "main"))
        (last.items as FrameMenuItem[]).push(item);
      else
        sections.push({
          id: section || "main",
          label: section || undefined,
          items: [item],
        });
    });
    return { ...p, homeHref: home.entry, menu: sections };
  });
}

/** The default crumbs: the product (its icon), its sidebar row, then the page — never the same level twice. */
export function derivedCrumbs(
  product: FrameProduct,
  item: FrameMenuItem | undefined,
  title: string,
  pathname: string,
  go: (href: string) => void,
): FrameCrumb[] {
  const crumbs: FrameCrumb[] = [
    {
      id: "product",
      label: product.name,
      icon: product.icon,
      iconOnly: true,
      href: product.homeHref,
      onSelect: () => go(product.homeHref),
    },
  ];
  const onItemPage = item?.href === pathname;
  if (item && !onItemPage)
    crumbs.push({
      id: "item",
      label: item.label,
      href: item.href,
      onSelect: () => item.href && go(item.href),
    });
  const pageLabel = title || item?.label || product.name;
  if (pageLabel !== crumbs[crumbs.length - 1].label || crumbs.length === 1)
    crumbs.push({ id: "page", label: pageLabel });
  return crumbs;
}

export default function FrameHostImpl({
  userData,
  isAuthenticated,
  initialGeometry,
  sideChat,
  children,
}: FrameHostProps) {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const sideChatState = useSideChatOpen({
    pathname,
    search: searchParams?.toString() ?? "",
    signedIn: isAuthenticated,
    initialChoice: sideChat.choice,
  });
  const toggleSideChat = () => sideChatState.setOpen(!sideChatState.open);
  useSideChatToggleKeys({
    enabled: isAuthenticated,
    canToggle: !sideChatState.standsAside,
    onToggle: toggleSideChat,
  });
  // History rows and comments reach the side chat before it has loaded: open it, queue the act.
  useEarlySideChatDoors({
    enabled: isAuthenticated && !sideChatState.standsAside,
    open: () => sideChatState.setOpen(true),
  });
  const [initialPathname] = useState(pathname);
  const sideChatHost = {
    signedIn: isAuthenticated,
    initialPathname,
    initialMode: sideChat.mode,
    open: sideChatState.open,
    onOpenChange: sideChatState.setOpen,
  };
  const canvas = useOptionalCanvas();
  const canvasOpen = useOptionalCanvasState(selectCanvasIsOpen, false);
  // ONE full-screen state: the canvas store's (the pane's expand control and the shortcut drive it).
  const canvasFull = useOptionalCanvasState(selectCanvasIsFullscreen, false);
  // The frame presents the canvas window while it is mounted: `openCanvasItem(...)` from any page
  // reaches the store and opens the frame's canvas, even before its body has loaded.
  useEffect(() => canvas?.registerPresentation(), [canvas]);
  const isAdmin = useAppSelector(selectIsAdminPerson);
  const goToEntries = menuGoToEntries({ isAuthenticated, isAdmin });
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [favorites, setFavorites] = useGridFavorites();
  const go = (href: string) => startTransition(() => router.push(href));

  const home = resolveRouteHome(FRAME_ROUTE_HOMES, pathname);
  const products = liveProducts(home.params);
  const product =
    products.find((p) => p.id === home.productId) ??
    products.find((p) => p.id === FRAME_DEFAULT_PRODUCT_ID) ??
    products[0];
  const items = product.menu.flatMap((s) => s.items);
  const item =
    home.itemIndex >= 0
      ? items.find((i) => i.id === itemId(home.itemIndex))
      : undefined;
  // A page whose template declared its trail names its own crumbs; otherwise the route table's.
  const { host: pageHeaderHost, pageCrumbs } = useFramePageHeaderHost();
  const crumbs =
    pageCrumbs && pageCrumbs.length > 0
      ? pageTrailCrumbs(product, pageCrumbs, go)
      : derivedCrumbs(product, item, home.title, pathname, go);
  const { pins, favorite } = useFramePins(pathname, crumbs[crumbs.length - 1].label);

  // THE PRODUCT'S OWN SIDEBAR (owner, 2026-10-22): the page's own sidebar, else the route
  // family's registered menu, else the route table's rows (frameProductSidebar.tsx).
  const ProductIcon = product.icon;
  const { slotHost, sidebarContent } = useFrameProductSidebar(pathname, <ProductIcon aria-hidden />);

  const actions: FrameAction[] = [
    {
      id: "copy-link",
      label: "Copy link",
      icon: Copy,
      onSelect: () => void copyText(window.location.href),
    },
    {
      id: "open-new-tab",
      label: "Open in new tab",
      icon: ExternalLink,
      onSelect: () => openOutbound(window.location.href, "_blank", "noopener"),
    },
  ];

  return (
    <div className="h-dvh w-full">
      <FramePageHeaderContext value={pageHeaderHost}>
      <FrameSideChatHostContext value={sideChatHost}>
        <FrameChrome
          userData={userData}
          isAuthenticated={isAuthenticated}
          products={products}
          families={PRODUCT_FAMILIES}
          product={product}
          favorites={favorites}
          onFavoritesChange={setFavorites}
          pins={isAuthenticated ? pins : undefined}
          onSelectPin={(pin) => go(pin.href)}
          favorite={isAuthenticated ? favorite : undefined}
          sidebarContent={sidebarContent}
          activeMenuItemId={item?.id}
          onSelectMenuItem={(selected) => selected.href && go(selected.href)}
          crumbs={crumbs}
          actions={actions}
          onBack={crumbs.length > 1 ? () => router.back() : undefined}
          variant="workspace"
          initialGeometry={initialGeometry}
          hostHeaderSlots
          goToEntries={goToEntries}
          onGoTo={go}
          loadCompanion={isAuthenticated ? loadSideChat : undefined}
          companionOpen={sideChatState.open}
          onCompanionOpenChange={sideChatState.setOpen}
          companionUnavailable={
            sideChatState.standsAside
              ? FRAME_SIDE_CHAT_HOSTED_ELSEWHERE
              : undefined
          }
          loadCanvas={canvas ? loadCanvas : undefined}
          canvasOpen={canvasOpen}
          canvasFull={canvasFull}
          onCanvasFullChange={(full) => canvas?.setFullscreen(full)}
          onCanvasOpenChange={(open) =>
            open ? canvas?.show() : canvas?.hide()
          }
        >
          <main
            className="shell-main"
            data-matrx-frame-main=""
            data-matrx-page-scroll=""
          >
            <FrameSidebarSlotContext value={slotHost}>{children}</FrameSidebarSlotContext>
          </main>
        </FrameChrome>
      </FrameSideChatHostContext>
      </FramePageHeaderContext>
    </div>
  );
}
