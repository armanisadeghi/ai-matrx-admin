"use client";

/**
 * Opener for the `imagePeekHost` overlay.
 *
 * - `useOpenImageArrivalPeekHost()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<ImageArrivalPeekHostController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "imagePeekHost" as const;

export interface OpenImageArrivalPeekHostOptions {
}

export interface ImageArrivalPeekHostHandle {
  close: () => void;
}

const opener = appOpener<OpenImageArrivalPeekHostOptions>(OVERLAY_ID, {
  data: () => ({}),
});

export const useOpenImageArrivalPeekHost = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const ImageArrivalPeekHostController = opener.Controller;

export type ImagePeekHostDefinitionData = OpenImageArrivalPeekHostOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    imagePeekHost: OverlayWire<ImagePeekHostDefinitionData>;
  }
}
