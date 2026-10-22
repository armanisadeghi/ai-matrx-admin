"use client";

/**
 * Opener for the `galleryWindow` overlay.
 *
 * - `useOpenGalleryWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<GalleryWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "galleryWindow" as const;

export interface OpenGalleryWindowOptions {
}

export interface GalleryWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenGalleryWindowOptions>(OVERLAY_ID, {
  data: () => ({}),
});

export const useOpenGalleryWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const GalleryWindowController = opener.Controller;

export type GalleryWindowDefinitionData = OpenGalleryWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    galleryWindow: OverlayWire<GalleryWindowDefinitionData>;
  }
}
