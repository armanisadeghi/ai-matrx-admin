"use client";

/**
 * Opener for the `userPreferences` overlay.
 *
 * - `useOpenSettingsShellOverlay()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<SettingsShellOverlayController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "userPreferences" as const;

export interface OpenSettingsShellOverlayOptions {
}

export interface SettingsShellOverlayHandle {
  close: () => void;
}

const opener = appOpener<OpenSettingsShellOverlayOptions>(OVERLAY_ID, {
  data: () => ({}),
});

export const useOpenSettingsShellOverlay = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const SettingsShellOverlayController = opener.Controller;

export type UserPreferencesDefinitionData = OpenSettingsShellOverlayOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    userPreferences: OverlayWire<UserPreferencesDefinitionData>;
  }
}
