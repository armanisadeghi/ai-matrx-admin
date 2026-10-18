"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * Lifts a block's full-screen layer to `document.body`.
 *
 * A `fixed inset-0` layer rendered in place is positioned against the nearest
 * ancestor with a `transform`, `filter` or `backdrop-filter` — a blurred card, a
 * scaled panel, a window — so "full screen" filled only that card. In a portal
 * it always covers the viewport. Inactive, children render where they are.
 */
export function FullScreenPortal({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  if (!active || typeof document === "undefined") return <>{children}</>;
  return createPortal(children, document.body);
}
