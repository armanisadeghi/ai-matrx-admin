"use client";

/**
 * Opener for the `favoritesManagerWindow` overlay — the "Manage favorites"
 * window (check app areas to pin / unpin, remove other pins).
 *
 * - `useOpenFavoritesManagerWindow()` — imperative hook; returns a handle with
 *   `close()`.
 * - `<FavoritesManagerWindowController />` — declarative mount-to-open wrapper.
 *
 * No-prop opener (the panel reads everything from preferences/Redux). Mirrors
 * the canonical shape in `audioDevices.tsx`.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "favoritesManagerWindow" as const;

export type OpenFavoritesManagerWindowOptions = Record<string, never>;

export interface FavoritesManagerWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenFavoritesManagerWindowOptions>(OVERLAY_ID, {
  data: () => ({}),
});

export const useOpenFavoritesManagerWindow = opener.useOpen;

/** Plain opener of the store, for boot-graph callers (useLazyAppOpener keeps this module out of first load). */
export const createFavoritesManagerWindowOpener = opener.forStore;

export const FavoritesManagerWindowController = opener.Controller;

export type FavoritesManagerWindowDefinitionData = OpenFavoritesManagerWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    favoritesManagerWindow: OverlayWire<FavoritesManagerWindowDefinitionData>;
  }
}
