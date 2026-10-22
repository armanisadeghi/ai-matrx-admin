"use client";

/**
 * Opener for the `canvasViewerWindow` overlay.
 *
 * - `useOpenCanvasViewerWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<CanvasViewerWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "canvasViewerWindow" as const;

export interface OpenCanvasViewerWindowOptions {
  title?: string;
  initialShareToken?: string;
}

export interface CanvasViewerWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenCanvasViewerWindowOptions>(OVERLAY_ID);

export const useOpenCanvasViewerWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const CanvasViewerWindowController = opener.Controller;

export type CanvasViewerWindowDefinitionData = OpenCanvasViewerWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    canvasViewerWindow: OverlayWire<CanvasViewerWindowDefinitionData>;
  }
}
