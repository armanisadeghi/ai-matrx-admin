"use client";

/**
 * Opener for the `galleryWindow` overlay.
 *
 * - `useOpenGalleryWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<GalleryWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "galleryWindow" as const;

export interface OpenGalleryWindowOptions {
}

export interface GalleryWindowHandle {
  close: () => void;
}

export function useOpenGalleryWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenGalleryWindowOptions = {}): GalleryWindowHandle => {
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
export function GalleryWindowController(props: OpenGalleryWindowOptions): null {
  const open = useOpenGalleryWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type GalleryWindowDefinitionData = OpenGalleryWindowOptions;

export const galleryWindowOverlay = defineOverlay<GalleryWindowDefinitionData>()({
  id: "galleryWindow",
  label: "Gallery Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          query: "",
          orientation: "all",
          viewMode: "grid",
          favorites: [],
        },
    windowId: "gallery-window",
    mobile: "fullscreen",
    mobileSidebarAs: "drawer",
  },
  link: {
    key: "gallery",
    hydrate: (ctx) => import("./galleryWindow.link").then((m) => m.hydrate(ctx)),
  },
  render: () => import("./galleryWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    galleryWindow: OverlayWire<GalleryWindowDefinitionData>;
  }
}
