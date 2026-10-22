"use client";

/**
 * Opener for the `observationalMemoryWindow` overlay.
 *
 * - `useOpenObservationalMemoryWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<ObservationalMemoryWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "observationalMemoryWindow" as const;

export interface OpenObservationalMemoryWindowOptions {
  initialSelectedConversationId?: string | null;
}

export interface ObservationalMemoryWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenObservationalMemoryWindowOptions>(OVERLAY_ID);

export const useOpenObservationalMemoryWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const ObservationalMemoryWindowController = opener.Controller;

export type ObservationalMemoryWindowDefinitionData = OpenObservationalMemoryWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    observationalMemoryWindow: OverlayWire<ObservationalMemoryWindowDefinitionData>;
  }
}
