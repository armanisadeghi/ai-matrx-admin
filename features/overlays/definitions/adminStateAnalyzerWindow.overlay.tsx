"use client";

/**
 * Opener for the `adminStateAnalyzerWindow` overlay.
 *
 * - `useOpenStateViewerWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<StateViewerWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "adminStateAnalyzerWindow" as const;

export interface OpenStateViewerWindowOptions {
}

export interface StateViewerWindowHandle {
  close: () => void;
}

export function useOpenStateViewerWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenStateViewerWindowOptions = {}): StateViewerWindowHandle => {
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
export function StateViewerWindowController(props: OpenStateViewerWindowOptions): null {
  const open = useOpenStateViewerWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AdminStateAnalyzerWindowDefinitionData = OpenStateViewerWindowOptions;

export const adminStateAnalyzerWindowOverlay = /* @__PURE__ */ defineOverlay<AdminStateAnalyzerWindowDefinitionData>()({
  id: "adminStateAnalyzerWindow",
  label: "Admin State Analyzer Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "state-analyzer-window",
    mobile: "card",
    ephemeral: true,
  },
  link: {
    key: "state_analyzer",
    hydrate: (ctx) => import("./adminStateAnalyzerWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    adminStateAnalyzerWindow: OverlayWire<AdminStateAnalyzerWindowDefinitionData>;
  }
}
