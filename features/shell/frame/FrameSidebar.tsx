"use client";

// The product's OWN sidebar (Linear / Docs style): the app grid and product
// name on top, then only this product's menu. It sits on the app canvas with
// no border. The top row is the header's height and offset, so the product
// name lines up with the sheet's breadcrumbs. Every row is a real link.
import { formatCount } from "@ai-matrx/kit/format";
import type { MouseEvent, ReactNode } from "react";
import { ExternalLink, PanelLeftClose, Star } from "lucide-react";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { Button, Tile } from "@ai-matrx/design-system/controls";
import { AppGrid } from "./AppGrid";
import { GoToSearch } from "./GoToSearch";
import type { GoToSearchProps } from "./GoToSearch";
import { ProductMark } from "./ProductMark";
import type { AppGridProps } from "./AppGrid";
import type { FrameBigItems, FrameMenuItem, FramePin, FrameProduct } from "./types";

export interface FrameSidebarProps {
  product: FrameProduct;
  grid: AppGridProps;
  /** The "Go to" search icon in the top row. */
  goTo: GoToSearchProps;
  activeItemId?: string;
  onSelectItem?: (item: FrameMenuItem) => void;
  /** Desktop: collapse the sidebar. Drawer: close it. */
  onHide: () => void;
  hideLabel: string;
  /** Pinned: the person's own pages. Omit to hide the section; an empty list shows the hint. */
  pins?: readonly FramePin[];
  onSelectPin?: (pin: FramePin) => void;
  /** The big products, always visible (top or bottom). Switching a product opens a new tab. */
  bigItems?: FrameBigItems;
  bigProducts?: readonly FrameProduct[];
  /** The host's controls pinned under the menu (settings, organization, the person). */
  footer?: ReactNode;
}

/** A plain left click goes to the host's handler; modified clicks keep the browser's link behaviour. */
export function isPlainClick(e: MouseEvent) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

export function FrameSidebar({
  product,
  grid,
  goTo,
  activeItemId,
  onSelectItem,
  onHide,
  hideLabel,
  footer,
  pins,
  onSelectPin,
  bigItems = "off",
  bigProducts = [],
}: FrameSidebarProps) {
  const big = bigItems !== "off" && bigProducts.length > 0 ? (
    <BigItems products={bigProducts} currentProductId={product.id} edge={bigItems} />
  ) : null;
  return (
    <nav aria-label={`${product.name} menu`} className="flex h-full min-h-0 flex-col">
      <div className="flex h-[calc(var(--matrx-frame-header-h)+var(--matrx-frame-inset))] shrink-0 items-center gap-1 px-2 pt-[var(--matrx-frame-inset)]">
        <AppGrid {...grid} currentProductId={product.id} />
        <ProductMark product={product} size="inline" />
        <span className="type-title min-w-0 flex-1 truncate pl-1">{product.name}</span>
        <GoToSearch {...goTo} />
        <Button variant="quiet" icon={<PanelLeftClose />} aria-label={hideLabel} onClick={onHide} />
      </div>
      <div className="mf-noscrollbar min-h-0 flex-1 overflow-y-auto px-2 pt-2 pb-4">
        {bigItems === "top" ? big : null}
        {pins ? <PinnedSection pins={pins} onSelectPin={onSelectPin} /> : null}
        {product.menu.map((section) => (
          <div key={section.id} className="pb-3">
            {section.label ? (
              <div className="flex h-7 items-center px-2">
                <span className="type-label">{section.label}</span>
              </div>
            ) : null}
            <ul className="flex flex-col gap-px">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = item.id === activeItemId;
                const href = item.href ?? `${product.homeHref}/${item.id}`;
                return (
                  <li key={item.id}>
                    <Tile
                      asChild
                      dense
                      variant="quiet"
                      className="w-full"
                      icon={<Icon aria-hidden />}
                      title={item.label}
                      selected={active || undefined}
                      selectedStyle="fill"
                      aria-current={active ? "page" : undefined}
                      end={
                        item.external ? (
                          <>
                            <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
                            <span className="sr-only">(opens in a new tab)</span>
                          </>
                        ) : item.count != null ? (
                          <span className="type-meta text-muted-foreground">
                            {formatCount(item.count)}
                          </span>
                        ) : undefined
                      }
                    >
                      <a
                        // Opts the row into the 44px touch floor inside a matrx-touch-targets subtree (the drawer).
                        data-tap-target=""
                        href={href}
                        title={item.hint}
                        target={item.external ? "_blank" : undefined}
                        rel={item.external ? "noopener noreferrer" : undefined}
                        onClick={(e) => {
                          if (item.external || !onSelectItem || !isPlainClick(e)) return;
                          e.preventDefault();
                          onSelectItem(item);
                        }}
                      />
                    </Tile>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      {bigItems === "bottom" ? big : null}
      {footer ? (
        <div data-mf-region="sidebar-footer" className="flex shrink-0 flex-col gap-px px-2 pt-1 pb-2">
          {footer}
        </div>
      ) : null}
    </nav>
  );
}

/** The empty Pinned space says how to fill it (≤60 chars). */
export const PINNED_EMPTY_HINT = "Star a page to pin it here";

function PinnedSection({
  pins,
  onSelectPin,
}: {
  pins: readonly FramePin[];
  onSelectPin?: (pin: FramePin) => void;
}) {
  return (
    <div data-mf-region="pinned" className="pb-3">
      <div className="flex h-7 items-center px-2">
        <span className="type-label">Pinned</span>
      </div>
      {pins.length === 0 ? (
        <p data-mf-pinned-empty="" className="type-meta px-2 py-1 text-muted-foreground">
          {PINNED_EMPTY_HINT}
        </p>
      ) : (
        <ul className="flex flex-col gap-px">
          {pins.map((pin) => {
            const Icon = pin.icon ?? Star;
            return (
              <li key={pin.id}>
                <Tile asChild dense variant="quiet" className="w-full" icon={<Icon aria-hidden />} title={pin.label}>
                  <a
                    data-tap-target=""
                    href={pin.href}
                    onClick={(e) => {
                      if (!onSelectPin || !isPlainClick(e)) return;
                      e.preventDefault();
                      onSelectPin(pin);
                    }}
                  />
                </Tile>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** The big products as one-line rows. A product switch always opens a new tab (owner rule). */
function BigItems({
  products,
  currentProductId,
  edge,
}: {
  products: readonly FrameProduct[];
  currentProductId: string;
  edge: "top" | "bottom";
}) {
  return (
    <div
      data-mf-region="big-items"
      data-edge={edge}
      className={edge === "top" ? "pb-3" : "shrink-0 px-2 pt-1 pb-1"}
    >
      <ul className="flex flex-col gap-px">
        {products.map((p) => {
          const current = p.id === currentProductId;
          return (
            <li key={p.id}>
              <Tile
                asChild
                dense
                variant="quiet"
                className="w-full"
                icon={<ProductMark product={p} size="inline" />}
                title={p.name}
                selected={current || undefined}
                selectedStyle="fill"
                aria-current={current ? "page" : undefined}
              >
                <OutboundLink href={p.homeHref} data-tap-target="">
                  <span className="sr-only">(opens in a new tab)</span>
                </OutboundLink>
              </Tile>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
