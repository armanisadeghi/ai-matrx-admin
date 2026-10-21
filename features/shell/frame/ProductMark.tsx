"use client";

// A PRODUCT'S MARK — Google's way (owner, 2026-10-20): the glyph itself carries the product's
// color and fills its box; no tinted tile behind it (except the bake-off's look C). The color is the design system's chip ink
// for the product's hue (`--matrx-chip-<hue>-ink`), which has a light and a dark value, so the
// mark keeps its contrast on the sheet in both themes. Used by the app grid (and its favorites)
// and the sidebar's product name.
import type { CSSProperties } from "react";
import { cn } from "@ai-matrx/design-system/cn";
import type { FrameProduct } from "./types";

/**
 * `grid` = a 32px glyph (the app grid's cell); `inline` = an 18px glyph beside a name. Sizes are
 * whole pixels on the SVG itself (no scaling, no transforms), stroke 1.75, so the line stays crisp.
 * `filled` (the grid bake-off's look C) puts a soft shape of the same hue (15%) behind a 24px glyph.
 */
export function ProductMark({
  product,
  size,
  filled = false,
}: {
  product: FrameProduct;
  size: "grid" | "inline";
  filled?: boolean;
}) {
  const Icon = product.icon;
  const hue = { "--mf-hue-ink": `var(--matrx-chip-${product.color}-ink)` } as CSSProperties;
  const px = size === "inline" ? 18 : filled ? 24 : 32;
  return (
    <span
      data-mf-mark={product.color}
      className={cn(
        "mf-mark flex shrink-0 items-center justify-center",
        size === "inline" ? "size-5" : filled ? "mf-mark-filled size-10" : "size-8",
      )}
      style={hue}
    >
      <Icon aria-hidden size={px} strokeWidth={1.75} absoluteStrokeWidth={false} />
    </span>
  );
}
