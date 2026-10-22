/**
 * components/cost/ProductPrice.tsx — THE TYPED MARKER for a price that is a brand's OWN content
 * (an offering's price, a listing's price, a course fee), not what the platform charged for AI work.
 *
 * `pnpm check:cost-display` skips lines inside `<ProductPrice>` and lines holding `asProductPrice(…)`;
 * there is no file exemption list, so the intent is visible at the exact place it applies. Never use
 * it for a figure the platform charged (points, a model's rate, a provider's cost): those sit behind
 * a `<CostDoor>`.
 */

import type { ReactNode } from "react";

export function ProductPrice({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={className} data-product-price="">
      {children}
    </span>
  );
}

/** A brand's own price as text (an outline, a copy payload). Identity at runtime; the marker is for the guard and the reader. */
export function asProductPrice(text: string): string;
export function asProductPrice(text: string | null | undefined): string | null;
export function asProductPrice(text: string | null | undefined): string | null {
  return text ?? null;
}
