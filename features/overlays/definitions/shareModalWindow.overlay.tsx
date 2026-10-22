"use client";

/**
 * Opener for the `shareModalWindow` overlay.
 *
 * - `useOpenShareModalWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<ShareModalWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { ResourceType } from "@ai-matrx/sharing/core";
import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "shareModalWindow" as const;

export interface OpenShareModalWindowOptions {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
}

export interface ShareModalWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenShareModalWindowOptions>(OVERLAY_ID);

export const useOpenShareModalWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const ShareModalWindowController = opener.Controller;

export type ShareModalWindowDefinitionData = OpenShareModalWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    shareModalWindow: OverlayWire<ShareModalWindowDefinitionData>;
  }
}
