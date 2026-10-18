"use client";

/**
 * Opener for the `quickUtilities` overlay.
 *
 * - `useOpenUtilitiesOverlay()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<UtilitiesOverlayController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "quickUtilities" as const;

export interface OpenUtilitiesOverlayOptions {
  /** TODO: tighten to `"notes" | "tasks" | "chat" | "data" | "files" | "ai-results"` once that type is imported. */
  initialTab?: unknown;
}

export interface UtilitiesOverlayHandle {
  close: () => void;
}

export function useOpenUtilitiesOverlay() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenUtilitiesOverlayOptions = {}): UtilitiesOverlayHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            initialTab: opts.initialTab,
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
export function UtilitiesOverlayController(props: OpenUtilitiesOverlayOptions): null {
  const open = useOpenUtilitiesOverlay();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.initialTab]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type QuickUtilitiesDefinitionData = OpenUtilitiesOverlayOptions;

export const quickUtilitiesOverlay = /* @__PURE__ */ defineOverlay<QuickUtilitiesDefinitionData>()({
  id: "quickUtilities",
  label: "Quick Utilities",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    quickUtilities: OverlayWire<QuickUtilitiesDefinitionData>;
  }
}
