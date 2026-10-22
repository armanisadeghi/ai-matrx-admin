"use client";

/**
 * Opener for the `cropStudioWindow` overlay.
 *
 * - `useOpenCropStudioWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<CropStudioWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "cropStudioWindow" as const;

export interface OpenCropStudioWindowOptions {
  initialFolderId?: string | null;
  defaultFolderPath?: string;
  initialAspect?: number;
}

export interface CropStudioWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenCropStudioWindowOptions>(OVERLAY_ID);

export const useOpenCropStudioWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const CropStudioWindowController = opener.Controller;

export type CropStudioWindowDefinitionData = OpenCropStudioWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    cropStudioWindow: OverlayWire<CropStudioWindowDefinitionData>;
  }
}
