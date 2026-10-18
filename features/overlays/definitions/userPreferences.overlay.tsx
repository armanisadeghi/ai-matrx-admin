"use client";

/**
 * Opener for the `userPreferences` overlay.
 *
 * - `useOpenSettingsShellOverlay()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<SettingsShellOverlayController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "userPreferences" as const;

export interface OpenSettingsShellOverlayOptions {
}

export interface SettingsShellOverlayHandle {
  close: () => void;
}

export function useOpenSettingsShellOverlay() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenSettingsShellOverlayOptions = {}): SettingsShellOverlayHandle => {
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
export function SettingsShellOverlayController(props: OpenSettingsShellOverlayOptions): null {
  const open = useOpenSettingsShellOverlay();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type UserPreferencesDefinitionData = OpenSettingsShellOverlayOptions;

export const userPreferencesOverlay = /* @__PURE__ */ defineOverlay<UserPreferencesDefinitionData>()({
  id: "userPreferences",
  label: "User Preferences",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    userPreferences: OverlayWire<UserPreferencesDefinitionData>;
  }
}
