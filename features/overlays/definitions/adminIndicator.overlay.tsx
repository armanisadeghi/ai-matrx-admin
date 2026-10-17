"use client";

/**
 * Opener for the `adminIndicator` overlay.
 *
 * - `useOpenAdminIndicator()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AdminIndicatorController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "adminIndicator" as const;

export interface OpenAdminIndicatorOptions {
}

export interface AdminIndicatorHandle {
  close: () => void;
}

export function useOpenAdminIndicator() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAdminIndicatorOptions = {}): AdminIndicatorHandle => {
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
export function AdminIndicatorController(props: OpenAdminIndicatorOptions): null {
  const open = useOpenAdminIndicator();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AdminIndicatorDefinitionData = OpenAdminIndicatorOptions;

export const adminIndicatorOverlay = defineOverlay<AdminIndicatorDefinitionData>()({
  id: "adminIndicator",
  label: "Admin Indicator",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    adminIndicator: OverlayWire<AdminIndicatorDefinitionData>;
  }
}
