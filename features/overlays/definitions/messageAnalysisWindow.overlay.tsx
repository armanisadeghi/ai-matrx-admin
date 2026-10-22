"use client";

/**
 * Opener for the `messageAnalysisWindow` overlay.
 *
 * - `useOpenMessageAnalysisWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<MessageAnalysisWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "messageAnalysisWindow" as const;

export interface OpenMessageAnalysisWindowOptions {
  conversationId: string | null;
  requestId?: string | null;
  messageId?: string | null;
}

export interface MessageAnalysisWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenMessageAnalysisWindowOptions>(OVERLAY_ID);

export const useOpenMessageAnalysisWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const MessageAnalysisWindowController = opener.Controller;

export type MessageAnalysisWindowDefinitionData = OpenMessageAnalysisWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    messageAnalysisWindow: OverlayWire<MessageAnalysisWindowDefinitionData>;
  }
}
