"use client";

// The product's OWN sidebar (Linear / Docs style): the app grid, Go to and collapse on top (no
// product name: the header's first crumb carries it), then only this product's menu. It sits on
// the app canvas with no border. The top row is the header's height and offset, so it lines up
// with the sheet's breadcrumbs. Every row is a real link.
import { formatCount } from "@ai-matrx/kit/format";
import type { ReactNode } from "react";
import { ExternalLink, PanelLeftClose, Pencil, Plus, Star } from "lucide-react";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { Button, Tile } from "@ai-matrx/design-system/controls";
import { AppGrid } from "./AppGrid";
import { GoToSearch } from "./GoToSearch";
import type { GoToSearchProps } from "./GoToSearch";
import { ProductMark } from "./ProductMark";
import { isPlainClick } from "./plainClick";
import type { AppGridProps } from "./AppGrid";
import type { FrameMenuItem, FramePin, FrameProduct } from "./types";

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
  /**
   * Pinned: the person's pins (or the starting set), a 3-per-row tile grid always visible at the
   * foot of the sidebar; every tile opens a new tab. Omit to hide the section.
   */
  pins?: readonly FramePin[];
  /** The products, for a product pin's mark and short name. */
  pinProducts?: readonly FrameProduct[];
  /** Pinned's edit icon and its dashed empty slot ("add"). Omit = not editable. */
  onEditPins?: (mode: "edit" | "add") => void;
  /** The host's controls pinned under the menu (settings, organization, the person). */
  footer?: ReactNode;
  /**
   * The product's own navigation from the host (a module menu or a page's sidebar). Replaces the
   * menu rows and fills the body; Pinned and the big items stay. It keeps its own scroller.
   */
  content?: ReactNode;
  /**
   * The top of the product's sidebar under the top row: Search, the chosen related places, More
   * (`ProductSidebarTop` from the host). Absent when the body carries its own (the conversation
   * sidebar on /chat).
   */
  top?: ReactNode;
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
  pinProducts = [],
  onEditPins,
  content,
  top,
}: FrameSidebarProps) {
  return (
    <nav aria-label={`${product.name} menu`} className="flex h-full min-h-0 flex-col">
      <div
        data-mf-region="sidebar-top-row"
        className="flex h-[calc(var(--matrx-frame-header-h)+var(--matrx-frame-inset))] shrink-0 items-center gap-1 px-2 pt-[var(--matrx-frame-inset)]"
      >
        <AppGrid {...grid} currentProductId={product.id} />
        {/* No product name or mark here (owner, 2026-10-22): the product is the header's first crumb. */}
        <span className="min-w-0 flex-1" aria-hidden />
        <GoToSearch {...goTo} />
        <Button variant="quiet" icon={<PanelLeftClose />} aria-label={hideLabel} onClick={onHide} />
      </div>
      {top != null ? (
        <div data-mf-region="product-top" className="shrink-0">
          {top}
        </div>
      ) : null}
      {content != null ? (
        // The product's own navigation: full-bleed, it brings its own padding and scroller.
        <div className="mf-noscrollbar flex min-h-0 flex-1 flex-col overflow-y-auto pt-2">
          <div data-mf-region="product-nav" className="flex min-h-0 flex-1 flex-col">
            {content}
          </div>
        </div>
      ) : (
      <div className="mf-noscrollbar min-h-0 flex-1 overflow-y-auto px-2 pt-2 pb-4">
        {product.menu.map((section) => (
          <div key={section.id} className="pb-3">
            {section.label ? (
              <div className="flex h-7 items-center px-2">
                <span className="type-label">{section.label}</span>
              </div>
            ) : null}
            <ul className="flex flex-col gap-px">
              {section.items.map((item) => (
                <li key={item.id}>
                  <MenuRow product={product} item={item} active={item.id === activeItemId} onSelectItem={onSelectItem} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      )}
      {pins ? (
        <PinnedSection pins={pins} products={pinProducts} currentProductId={product.id} onEdit={onEditPins} />
      ) : null}
      {footer ? (
        <div data-mf-region="sidebar-footer" className="flex shrink-0 flex-col gap-px px-2 pt-1 pb-2">
          {footer}
        </div>
      ) : null}
    </nav>
  );
}

/** One route-table row (the frame's own row style): a real link, the host's handler on a plain click. */
function MenuRow({
  product,
  item,
  active,
  onSelectItem,
}: {
  product: FrameProduct;
  item: FrameMenuItem;
  active: boolean;
  onSelectItem?: (item: FrameMenuItem) => void;
}) {
  const Icon = item.icon;
  const href = item.href ?? `${product.homeHref}/${item.id}`;
  return (
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
          <span className="type-meta text-muted-foreground">{formatCount(item.count)}</span>
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
  );
}

/** Pinned's edit icon (its accessible name and tooltip). */
export const PINNED_EDIT_LABEL = "Edit pinned";
/** The dashed empty slot (its accessible name). */
export const PINNED_ADD_LABEL = "Add a pin";

/**
 * PINNED (Arman, 2026-10-22): one always-visible list — a compact tile grid, three per row, each a
 * product mark (or the page's icon) over a short name, opening a new tab; the heading's pencil edits
 * it, and the last spot is an empty dashed slot that adds one.
 */
function PinnedSection({
  pins,
  products,
  currentProductId,
  onEdit,
}: {
  pins: readonly FramePin[];
  products: readonly FrameProduct[];
  currentProductId: string;
  onEdit?: (mode: "edit" | "add") => void;
}) {
  return (
    <div data-mf-region="pinned" className="shrink-0 px-2 pt-1 pb-1">
      <div className="flex h-7 items-center pl-2">
        <span className="type-label flex-1">Pinned</span>
        {onEdit ? (
          <Button
            variant="quiet"
            icon={<Pencil />}
            aria-label={PINNED_EDIT_LABEL}
            title={PINNED_EDIT_LABEL}
            data-mf-pinned-edit=""
            onClick={() => onEdit("edit")}
          />
        ) : null}
      </div>
      <ul className="grid grid-cols-3 gap-1" data-mf-pinned-grid="">
        {pins.map((pin) => {
          const product = pin.productId ? products.find((p) => p.id === pin.productId) : undefined;
          const Icon = pin.icon ?? Star;
          const current = product?.id === currentProductId;
          return (
            <li key={pin.id} className="min-w-0" data-mf-pin={product?.id ?? pin.id}>
              <Tile
                asChild
                dense
                layout="stack"
                variant="quiet"
                className="w-full"
                icon={product ? <ProductMark product={product} size="inline" /> : <Icon aria-hidden />}
                title={product?.shortName ?? product?.name ?? pin.label}
                selected={current || undefined}
                selectedStyle="fill"
              >
                <OutboundLink href={pin.href} data-tap-target="" title={pin.label}>
                  <span className="sr-only">(opens in a new tab)</span>
                </OutboundLink>
              </Tile>
            </li>
          );
        })}
        {onEdit ? (
          <li className="min-w-0">
            <button
              type="button"
              data-tap-target=""
              data-mf-pin-slot=""
              aria-label={PINNED_ADD_LABEL}
              title={PINNED_ADD_LABEL}
              className="mf-pin-slot flex h-full min-h-14 w-full items-center justify-center"
              onClick={() => onEdit("add")}
            >
              <Plus aria-hidden className="size-4 text-muted-foreground" />
            </button>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
