"use client";

/**
 * Opener for the `contextSwitcherWindow` overlay.
 *
 * - `useOpenContextSwitcherWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<ContextSwitcherWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "contextSwitcherWindow" as const;

export interface OpenContextSwitcherWindowOptions {
}

export interface ContextSwitcherWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenContextSwitcherWindowOptions>(OVERLAY_ID, {
  data: () => ({}),
});

export const useOpenContextSwitcherWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const ContextSwitcherWindowController = opener.Controller;

export type ContextSwitcherWindowDefinitionData = OpenContextSwitcherWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    contextSwitcherWindow: OverlayWire<ContextSwitcherWindowDefinitionData>;
  }
}
