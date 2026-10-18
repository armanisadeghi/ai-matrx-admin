"use client";

// The product's OWN sidebar (Linear / Docs style): the app grid and product
// name on top, then only this product's menu. It sits on the app background
// with no border. The top row is the header's height and offset, so the
// product name lines up with the sheet's breadcrumbs.
import { PanelLeftClose } from "lucide-react";
import { Button, Tile } from "@ai-matrx/design-system/controls";
import { AppGrid } from "./AppGrid";
import type { AppGridProps } from "./AppGrid";
import type { FrameMenuItem, FrameProduct } from "./types";

export interface FrameSidebarProps {
  product: FrameProduct;
  grid: AppGridProps;
  activeItemId?: string;
  onSelectItem?: (item: FrameMenuItem) => void;
  /** Desktop: collapse the sidebar. Phone drawer: close it. */
  onHide: () => void;
  hideLabel: string;
}

export function FrameSidebar({
  product,
  grid,
  activeItemId,
  onSelectItem,
  onHide,
  hideLabel,
}: FrameSidebarProps) {
  const ProductIcon = product.icon;
  return (
    <nav aria-label={`${product.name} menu`} className="flex h-full min-h-0 flex-col">
      <div className="flex h-[calc(var(--frame-header-h)+var(--frame-inset))] shrink-0 items-center gap-1 px-2 pt-[var(--frame-inset)]">
        <AppGrid {...grid} currentProductId={product.id} />
        <span
          className="mf-glyph flex size-5 shrink-0 items-center justify-center rounded-[5px]"
          style={
            {
              "--mf-hue": `var(--matrx-chip-${product.color})`,
              "--mf-hue-ink": `var(--matrx-chip-${product.color}-ink)`,
            } as React.CSSProperties
          }
        >
          <ProductIcon className="size-3.5" aria-hidden />
        </span>
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
                return (
                  <li key={item.id}>
                    <Tile
                      dense
                      variant="quiet"
                      className="w-full"
                      icon={<Icon aria-hidden />}
                      title={item.label}
                      selected={item.id === activeItemId}
                      aria-current={item.id === activeItemId ? "page" : undefined}
                      end={
                        item.count != null ? (
                          <span className="type-meta text-muted-foreground">
                            {item.count.toLocaleString()}
                          </span>
                        ) : undefined
                      }
                      onClick={() => onSelectItem?.(item)}
                    />
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
