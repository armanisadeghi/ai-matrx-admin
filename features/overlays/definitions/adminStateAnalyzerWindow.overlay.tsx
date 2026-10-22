"use client";

/**
 * Opener for the `adminStateAnalyzerWindow` overlay.
 *
 * - `useOpenStateViewerWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<StateViewerWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "adminStateAnalyzerWindow" as const;

export interface OpenStateViewerWindowOptions {
}

export interface StateViewerWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenStateViewerWindowOptions>(OVERLAY_ID, {
  data: () => ({}),
});

export const useOpenStateViewerWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const StateViewerWindowController = opener.Controller;

export type AdminStateAnalyzerWindowDefinitionData = OpenStateViewerWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    adminStateAnalyzerWindow: OverlayWire<AdminStateAnalyzerWindowDefinitionData>;
  }
}
