"use client";

/**
 * Opener for the `streamDebug` overlay.
 *
 * - `useOpenStreamDebugFloating()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<StreamDebugFloatingController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "streamDebug" as const;

export interface OpenStreamDebugFloatingOptions {
  conversationId: string;
  /** TODO: tighten to `{ x: number; y: number }` once that type is imported. */
  defaultPosition?: unknown;
  requestIdOverride?: string;
}

export interface StreamDebugFloatingHandle {
  close: () => void;
}

const opener = appOpener<OpenStreamDebugFloatingOptions>(OVERLAY_ID);

export const useOpenStreamDebugFloating = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const StreamDebugFloatingController = opener.Controller;

export type StreamDebugDefinitionData = OpenStreamDebugFloatingOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    streamDebug: OverlayWire<StreamDebugDefinitionData>;
  }
}
