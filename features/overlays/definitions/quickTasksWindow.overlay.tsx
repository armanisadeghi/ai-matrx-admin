"use client";

/**
 * Opener for the `quickTasksWindow` overlay.
 *
 * - `useOpenQuickTasksWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<QuickTasksWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "quickTasksWindow" as const;

export interface OpenQuickTasksWindowOptions {
}

export interface QuickTasksWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenQuickTasksWindowOptions>(OVERLAY_ID, {
  data: () => ({}),
});

export const useOpenQuickTasksWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const QuickTasksWindowController = opener.Controller;

export type QuickTasksWindowDefinitionData = OpenQuickTasksWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    quickTasksWindow: OverlayWire<QuickTasksWindowDefinitionData>;
  }
}
