"use client";

/**
 * Opener for the `adminStateAnalyzer` overlay.
 *
 * - `useOpenStateViewerOverlay()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<StateViewerOverlayController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "adminStateAnalyzer" as const;

export interface OpenStateViewerOverlayOptions {
}

export interface StateViewerOverlayHandle {
  close: () => void;
}

const opener = appOpener<OpenStateViewerOverlayOptions>(OVERLAY_ID, {
  data: () => ({}),
});

export const useOpenStateViewerOverlay = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const StateViewerOverlayController = opener.Controller;

export type AdminStateAnalyzerDefinitionData = OpenStateViewerOverlayOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    adminStateAnalyzer: OverlayWire<AdminStateAnalyzerDefinitionData>;
  }
}
