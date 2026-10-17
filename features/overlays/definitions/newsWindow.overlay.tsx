"use client";

/**
 * Opener for the `newsWindow` overlay.
 *
 * - `useOpenNewsWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<NewsWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "newsWindow" as const;

export interface OpenNewsWindowOptions {
}

export interface NewsWindowHandle {
  close: () => void;
}

export function useOpenNewsWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenNewsWindowOptions = {}): NewsWindowHandle => {
      dispatch(openOverlay({ overlayId: OVERLAY_ID }));
      return {
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
      };
    },
    [dispatch],
  );
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export function NewsWindowController(props: OpenNewsWindowOptions): null {
  const open = useOpenNewsWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type NewsWindowDefinitionData = OpenNewsWindowOptions;

export const newsWindowOverlay = /* @__PURE__ */ defineOverlay<NewsWindowDefinitionData>()({
  id: "newsWindow",
  label: "News Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { category: "general", country: "us" },
    windowId: "news-window",
    mobile: "fullscreen",
  },
  link: {
    key: "news",
    hydrate: (ctx) => import("./newsWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    newsWindow: OverlayWire<NewsWindowDefinitionData>;
  }
}
