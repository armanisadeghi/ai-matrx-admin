"use client";

/**
 * Opener for the `singleMessageWindow` overlay.
 *
 * - `useOpenSingleMessageWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<SingleMessageWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "singleMessageWindow" as const;

export interface OpenSingleMessageWindowOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  conversationId: string;
}

export interface SingleMessageWindowHandle {
  instanceId: string;
  close: () => void;
}

const opener = appOpener<OpenSingleMessageWindowOptions>(OVERLAY_ID, {
  multi: true,
});

export const useOpenSingleMessageWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const SingleMessageWindowController = opener.Controller;

export type SingleMessageWindowDefinitionData = OpenSingleMessageWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    singleMessageWindow: OverlayWire<SingleMessageWindowDefinitionData>;
  }
}
