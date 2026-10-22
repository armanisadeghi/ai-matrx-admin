"use client";

/**
 * Opener for the `pdfExtractorWindow` overlay.
 *
 * - `useOpenPdfExtractorWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<PdfExtractorWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "pdfExtractorWindow" as const;

export interface OpenPdfExtractorWindowOptions {
}

export interface PdfExtractorWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenPdfExtractorWindowOptions>(OVERLAY_ID, {
  data: () => ({}),
});

export const useOpenPdfExtractorWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const PdfExtractorWindowController = opener.Controller;

export type PdfExtractorWindowDefinitionData = OpenPdfExtractorWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    pdfExtractorWindow: OverlayWire<PdfExtractorWindowDefinitionData>;
  }
}
