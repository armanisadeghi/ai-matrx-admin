"use client";

/**
 * Opener for the `adminStateAnalyzer` overlay.
 *
 * - `useOpenStateViewerOverlay()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<StateViewerOverlayController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "adminStateAnalyzer" as const;

export interface OpenStateViewerOverlayOptions {
}

export interface StateViewerOverlayHandle {
  close: () => void;
}

export function useOpenStateViewerOverlay() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenStateViewerOverlayOptions = {}): StateViewerOverlayHandle => {
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
export function StateViewerOverlayController(props: OpenStateViewerOverlayOptions): null {
  const open = useOpenStateViewerOverlay();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AdminStateAnalyzerDefinitionData = OpenStateViewerOverlayOptions;

export const adminStateAnalyzerOverlay = /* @__PURE__ */ defineOverlay<AdminStateAnalyzerDefinitionData>()({
  id: "adminStateAnalyzer",
  label: "Admin State Analyzer",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    adminStateAnalyzer: OverlayWire<AdminStateAnalyzerDefinitionData>;
  }
}
