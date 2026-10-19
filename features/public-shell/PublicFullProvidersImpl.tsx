"use client";

// The full public tree, loaded only through PublicAppRoot's one dynamic edge: the app Providers,
// the canvas column, and the Redux header islands. Never import this file statically.

import { useEffect, useRef, type ReactNode } from "react";
import { Providers } from "@/app/Providers";
import { ShellCanvasColumn } from "@/features/canvas/host/ShellCanvasColumn";
import { selectCanvasIsHydrated, selectCanvasIsOpen } from "@ai-matrx/canvas";
import { useCanvas, useCanvasState } from "@ai-matrx/canvas/react";
import { PublicTierContext, type PublicTier } from "./publicTier";
import { PublicHeaderFullIslands } from "./PublicHeaderFullIslands";

const FULL_TIER: PublicTier = { full: true, requestFull: () => {}, FullIslands: PublicHeaderFullIslands };

/** The light header's canvas button asked for the canvas: open it once the saved state is in. */
function OpenCanvasOnce() {
  const canvas = useCanvas();
  const hydrated = useCanvasState(selectCanvasIsHydrated);
  const isOpen = useCanvasState((s) => selectCanvasIsOpen(s));
  const done = useRef(false);
  useEffect(() => {
    if (!hydrated || done.current) return;
    done.current = true;
    if (!isOpen) canvas.toggle();
  }, [hydrated, isOpen, canvas]);
  return null;
}

export default function PublicFullProvidersImpl({ children, openCanvas }: { children: ReactNode; openCanvas: boolean }) {
  return (
    <Providers>
      <PublicTierContext.Provider value={FULL_TIER}>{children}</PublicTierContext.Provider>
      {/* THE canvas column — the public layout gives up --shell-canvas-w on the right, so the
          canvas never covers the page. Tab bodies load lazily per kind. */}
      <ShellCanvasColumn />
      {openCanvas ? <OpenCanvasOnce /> : null}
    </Providers>
  );
}
