"use client";

/**
 * Opener for the `browserFrameWindow` overlay.
 *
 * - `useOpenBrowserFrameWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<BrowserFrameWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "browserFrameWindow" as const;

export interface OpenBrowserFrameWindowOptions {
  initialUrl?: string | null;
  initialWindowTitle?: string | null;
}

export interface BrowserFrameWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenBrowserFrameWindowOptions>(OVERLAY_ID);

export const useOpenBrowserFrameWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const BrowserFrameWindowController = opener.Controller;

export type BrowserFrameWindowDefinitionData = OpenBrowserFrameWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    browserFrameWindow: OverlayWire<BrowserFrameWindowDefinitionData>;
  }
}
