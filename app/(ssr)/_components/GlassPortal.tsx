"use client";

// GlassPortal — Portals children into #glass-layer at the root of the DOM.
//
// WHY: backdrop-filter is broken in Chromium whenever an ancestor has
// overflow, transform, will-change, filter, or backdrop-filter itself.
// Shell content (shell-root, shell-main) has all of these.
//
// The solution: a dedicated #glass-layer div that is a direct child of <body>,
// outside all content stacking contexts. Every glass chrome element (dock,
// panels, sheets) renders here — guaranteed backdrop-filter in all browsers.
//
// Usage:
//   <GlassPortal>
//     <MobileDock />
//   </GlassPortal>

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface GlassPortalProps {
  children: React.ReactNode;
}

export default function GlassPortal({ children }: GlassPortalProps) {
  const [layer, setLayer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setLayer(document.getElementById("glass-layer"));
  }, []);

  if (!layer) return null;
  return createPortal(children, layer);
}
