"use client";

/**
 * Opener for the `quickDataWindow` overlay.
 *
 * - `useOpenQuickDataWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<QuickDataWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "quickDataWindow" as const;

export interface OpenQuickDataWindowOptions {
  selectedTable?: string | null;
}

export interface QuickDataWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenQuickDataWindowOptions>(OVERLAY_ID);

export const useOpenQuickDataWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const QuickDataWindowController = opener.Controller;

export type QuickDataWindowDefinitionData = OpenQuickDataWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    quickDataWindow: OverlayWire<QuickDataWindowDefinitionData>;
  }
}
