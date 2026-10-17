"use client";

/**
 * Opener for the `canvasViewerWindow` overlay.
 *
 * - `useOpenCanvasViewerWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<CanvasViewerWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "canvasViewerWindow" as const;

export interface OpenCanvasViewerWindowOptions {
  title?: string;
  initialShareToken?: string;
}

export interface CanvasViewerWindowHandle {
  close: () => void;
}

export function useOpenCanvasViewerWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenCanvasViewerWindowOptions = {}): CanvasViewerWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            title: opts.title,
            initialShareToken: opts.initialShareToken,
          },
        }),
      );
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
export function CanvasViewerWindowController(props: OpenCanvasViewerWindowOptions): null {
  const open = useOpenCanvasViewerWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.title, props.initialShareToken]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type CanvasViewerWindowDefinitionData = OpenCanvasViewerWindowOptions;

export const canvasViewerWindowOverlay = /* @__PURE__ */ defineOverlay<CanvasViewerWindowDefinitionData>()({
  id: "canvasViewerWindow",
  label: "Canvas Viewer Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { shareToken: null },
    windowId: "canvas-viewer-window",
    mobile: "fullscreen",
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    canvasViewerWindow: OverlayWire<CanvasViewerWindowDefinitionData>;
  }
}
