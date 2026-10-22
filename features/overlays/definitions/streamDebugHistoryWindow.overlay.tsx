"use client";

/**
 * Opener for the `streamDebugHistoryWindow` overlay.
 *
 * - `useOpenStreamDebugHistoryWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<StreamDebugHistoryWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "streamDebugHistoryWindow" as const;

export interface OpenStreamDebugHistoryWindowOptions {
  initialConversationId?: string | null;
}

export interface StreamDebugHistoryWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenStreamDebugHistoryWindowOptions>(OVERLAY_ID);

export const useOpenStreamDebugHistoryWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const StreamDebugHistoryWindowController = opener.Controller;

export type StreamDebugHistoryWindowDefinitionData = OpenStreamDebugHistoryWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    streamDebugHistoryWindow: OverlayWire<StreamDebugHistoryWindowDefinitionData>;
  }
}
