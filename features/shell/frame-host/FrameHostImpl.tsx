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
import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Copy, ExternalLink, LayoutList } from "lucide-react";
import { copyText } from "@ai-matrx/kit/clipboard";
import { openOutbound } from "@ai-matrx/kit/outbound";
import { FrameChrome } from "./FrameChrome";
import type { FrameHostProps } from "./FrameHostGate";
import { PRODUCTS, PRODUCT_FAMILIES } from "@/features/shell/frame/products";
import { FRAME_ROUTE_HOMES } from "@/features/shell/frame/route-homes.generated";
import { FRAME_DEFAULT_PRODUCT_ID, fillPattern, resolveRouteHome } from "@/features/shell/frame/routeHomeLookup";
import type { FrameAction, FrameCrumb, FrameMenuItem, FrameMenuSection, FrameProduct } from "@/features/shell/frame/types";

/** The two panels this step does not bring into the frame yet (ROLLOUT-PLAN P3) — said, never silent. */
export const FRAME_SIDE_CHAT_PENDING = "The side chat comes to the new layout in the next step";
export const FRAME_CANVAS_PENDING = "The canvas comes to the new layout in the next step";

const itemId = (index: number) => `r-${index}`;

/** The live products: real entries and sidebars with real links, filled from the current page's params. */
export function liveProducts(params: Record<string, string>): FrameProduct[] {
  return PRODUCTS.map((p) => {
    const home = FRAME_ROUTE_HOMES.products[p.id];
    if (!home || home.items.length === 0) {
      return { ...p, homeHref: home?.entry ?? p.homeHref, menu: [{ id: "main", items: [{ id: "home", label: p.name, icon: p.icon, href: home?.entry ?? p.homeHref }] }] };
    }
    const sections: FrameMenuSection[] = [];
    home.items.forEach(([section, label, pattern, fallback], index) => {
      const item: FrameMenuItem = { id: itemId(index), label, icon: LayoutList, href: fillPattern(pattern, params) ?? fallback, hint: pattern };
      const last = sections[sections.length - 1];
      if (last && last.id === (section || "main")) (last.items as FrameMenuItem[]).push(item);
      else sections.push({ id: section || "main", label: section || undefined, items: [item] });
    });
    return { ...p, homeHref: home.entry, menu: sections };
  });
}

/** The default crumbs: the product (its icon), its sidebar row, then the page — never the same level twice. */
export function derivedCrumbs(product: FrameProduct, item: FrameMenuItem | undefined, title: string, pathname: string, go: (href: string) => void): FrameCrumb[] {
  const crumbs: FrameCrumb[] = [
    { id: "product", label: product.name, icon: product.icon, iconOnly: true, href: product.homeHref, onSelect: () => go(product.homeHref) },
  ];
  const onItemPage = item?.href === pathname;
  if (item && !onItemPage) crumbs.push({ id: "item", label: item.label, href: item.href, onSelect: () => item.href && go(item.href) });
  const pageLabel = title || item?.label || product.name;
  if (pageLabel !== crumbs[crumbs.length - 1].label || crumbs.length === 1) crumbs.push({ id: "page", label: pageLabel });
  return crumbs;
}

export default function FrameHostImpl({ userData, isAuthenticated, initialGeometry, children }: FrameHostProps) {
  const pathname = usePathname() ?? "/";
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [favorites, setFavorites] = useState<string[]>([]);
  const go = (href: string) => startTransition(() => router.push(href));

  const home = resolveRouteHome(FRAME_ROUTE_HOMES, pathname);
  const products = liveProducts(home.params);
  const product = products.find((p) => p.id === home.productId) ?? products.find((p) => p.id === FRAME_DEFAULT_PRODUCT_ID) ?? products[0];
  const items = product.menu.flatMap((s) => s.items);
  const item = home.itemIndex >= 0 ? items.find((i) => i.id === itemId(home.itemIndex)) : undefined;
  const crumbs = derivedCrumbs(product, item, home.title, pathname, go);

  const actions: FrameAction[] = [
    { id: "copy-link", label: "Copy link", icon: Copy, onSelect: () => void copyText(window.location.href) },
    { id: "open-new-tab", label: "Open in new tab", icon: ExternalLink, onSelect: () => openOutbound(window.location.href, "_blank", "noopener") },
  ];

  return (
    <div className="h-dvh w-full">
      <FrameChrome
        userData={userData}
        isAuthenticated={isAuthenticated}
        products={products}
        families={PRODUCT_FAMILIES}
        product={product}
        favorites={favorites}
        onFavoritesChange={setFavorites}
        activeMenuItemId={item?.id}
        onSelectMenuItem={(selected) => selected.href && go(selected.href)}
        crumbs={crumbs}
        actions={actions}
        onBack={crumbs.length > 1 ? () => router.back() : undefined}
        variant="workspace"
        pageKey={pathname}
        initialGeometry={initialGeometry}
        hostHeaderSlots
        companionUnavailable={FRAME_SIDE_CHAT_PENDING}
        canvasUnavailable={FRAME_CANVAS_PENDING}
      >
        <main className="shell-main" data-matrx-frame-main="" data-matrx-page-scroll="">
          {children}
        </main>
      </FrameChrome>
    </div>
  );
}
