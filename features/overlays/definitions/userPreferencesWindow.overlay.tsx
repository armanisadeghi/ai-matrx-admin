"use client";

/**
 * Opener for the `userPreferencesWindow` overlay.
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
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "userPreferencesWindow" as const;

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

export type UserPreferencesWindowDefinitionData = OpenSettingsShellOverlayOptions;

export const userPreferencesWindowOverlay = /* @__PURE__ */ defineOverlay<UserPreferencesWindowDefinitionData>()({
  id: "userPreferencesWindow",
  label: "User Preferences Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  link: {
    key: "user_preferences",
    hydrate: (ctx) => import("./userPreferencesWindow.link").then((m) => m.hydrate(ctx)),
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    userPreferencesWindow: OverlayWire<UserPreferencesWindowDefinitionData>;
  }
}
