"use client";

/**
 * Opener for the `browserWorkbenchWindow` overlay.
 *
 * - `useOpenBrowserWorkbenchWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<BrowserWorkbenchWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "browserWorkbenchWindow" as const;

export interface OpenBrowserWorkbenchWindowOptions {
  initialBookmarks?: unknown;
  initialTabs?: unknown;
  initialActiveTabId?: string | null;
}

export interface BrowserWorkbenchWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenBrowserWorkbenchWindowOptions>(OVERLAY_ID);

export const useOpenBrowserWorkbenchWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const BrowserWorkbenchWindowController = opener.Controller;

export type BrowserWorkbenchWindowDefinitionData = OpenBrowserWorkbenchWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    browserWorkbenchWindow: OverlayWire<BrowserWorkbenchWindowDefinitionData>;
  }
}
