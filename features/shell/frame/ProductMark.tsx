"use client";

// A PRODUCT'S MARK — Google's way (owner, 2026-10-20): the glyph itself carries the product's
// colour and fills its box; no tinted tile behind it. The colour is the design system's chip ink
// for the product's hue (`--matrx-chip-<hue>-ink`), which has a light and a dark value, so the
// mark keeps its contrast on the sheet in both themes. Used by the app grid (and its favorites)
// and the sidebar's product name.
import type { CSSProperties } from "react";
import { cn } from "@ai-matrx/design-system/cn";
import type { FrameProduct } from "./types";

/** `grid` = a 40px glyph in the grid's 48px cell; `inline` = an 18px glyph beside a name. */
export function ProductMark({ product, size }: { product: FrameProduct; size: "grid" | "inline" }) {
  const Icon = product.icon;
  const hue = { "--mf-hue-ink": `var(--matrx-chip-${product.color}-ink)` } as CSSProperties;
  return (
    <span
      data-mf-mark={product.color}
      className={cn("mf-mark flex shrink-0 items-center justify-center", size === "grid" ? "size-12" : "size-5")}
      style={hue}
    >
      <Icon
        aria-hidden
        className={size === "grid" ? "size-10" : "size-[18px]"}
        strokeWidth={size === "grid" ? 1.5 : 1.75}
      />
    </span>
  );
}
