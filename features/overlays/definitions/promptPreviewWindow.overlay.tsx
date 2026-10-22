"use client";

/**
 * Opener for the `promptPreviewWindow` overlay.
 *
 * - `useOpenPromptPreviewWindow()` — imperative hook. Call to open with typed
 *   options; returns a handle with a `close()` method.
 * - `<PromptPreviewWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "promptPreviewWindow" as const;

export interface OpenPromptPreviewWindowOptions {
  conversationId: string;
}

export interface PromptPreviewWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
const opener = appOpener<OpenPromptPreviewWindowOptions>(OVERLAY_ID);

export const createPromptPreviewWindowOpener = opener.forStore;

export const useOpenPromptPreviewWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount.
 */
export const PromptPreviewWindowController = opener.Controller;

export type PromptPreviewWindowDefinitionData = OpenPromptPreviewWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    promptPreviewWindow: OverlayWire<PromptPreviewWindowDefinitionData>;
  }
}
