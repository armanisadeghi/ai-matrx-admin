"use client";

/**
 * Opener for the `quickUtilities` overlay.
 *
 * - `useOpenUtilitiesOverlay()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<UtilitiesOverlayController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "quickUtilities" as const;

export interface OpenUtilitiesOverlayOptions {
  /** TODO: tighten to `"notes" | "tasks" | "chat" | "data" | "files" | "ai-results"` once that type is imported. */
  initialTab?: unknown;
}

export interface UtilitiesOverlayHandle {
  close: () => void;
}

const opener = appOpener<OpenUtilitiesOverlayOptions>(OVERLAY_ID);

export const useOpenUtilitiesOverlay = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const UtilitiesOverlayController = opener.Controller;

export type QuickUtilitiesDefinitionData = OpenUtilitiesOverlayOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    quickUtilities: OverlayWire<QuickUtilitiesDefinitionData>;
  }
}
