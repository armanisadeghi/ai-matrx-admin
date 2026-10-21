"use client";

// The product's OWN sidebar (Linear / Docs style): the app grid and product
// name on top, then only this product's menu. It sits on the app canvas with
// no border. The top row is the header's height and offset, so the product
// name lines up with the sheet's breadcrumbs. Every row is a real link.
import type { MouseEvent } from "react";
import { ExternalLink, PanelLeftClose } from "lucide-react";
import { Button, Tile } from "@ai-matrx/design-system/controls";
import { AppGrid } from "./AppGrid";
import { ProductMark } from "./ProductMark";
import type { AppGridProps } from "./AppGrid";
import type { FrameMenuItem, FrameProduct } from "./types";

export interface FrameSidebarProps {
  product: FrameProduct;
  grid: AppGridProps;
  activeItemId?: string;
  onSelectItem?: (item: FrameMenuItem) => void;
  /** Desktop: collapse the sidebar. Drawer: close it. */
  onHide: () => void;
  hideLabel: string;
}

/** A plain left click goes to the host's handler; modified clicks keep the browser's link behaviour. */
export function isPlainClick(e: MouseEvent) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

export function FrameSidebar({
  product,
  grid,
  activeItemId,
  onSelectItem,
  onHide,
  hideLabel,
}: FrameSidebarProps) {
  return (
    <nav aria-label={`${product.name} menu`} className="flex h-full min-h-0 flex-col">
      <div className="flex h-[calc(var(--matrx-frame-header-h)+var(--matrx-frame-inset))] shrink-0 items-center gap-1 px-2 pt-[var(--matrx-frame-inset)]">
        <AppGrid {...grid} currentProductId={product.id} />
        <ProductMark product={product} size="inline" />
        <span className="type-title min-w-0 flex-1 truncate pl-1">{product.name}</span>
        <Button variant="quiet" icon={<PanelLeftClose />} aria-label={hideLabel} onClick={onHide} />
      </div>
      <div className="mf-noscrollbar min-h-0 flex-1 overflow-y-auto px-2 pt-2 pb-4">
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
                            {item.count.toLocaleString()}
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
    </nav>
  );
}
