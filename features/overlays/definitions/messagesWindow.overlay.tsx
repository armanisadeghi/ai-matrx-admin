"use client";

/**
 * Opener for the `messagesWindow` overlay.
 *
 * - `useOpenMessagesWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<MessagesWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "messagesWindow" as const;

export interface OpenMessagesWindowOptions {
  conversationId?: string | null;
}

export interface MessagesWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenMessagesWindowOptions>(OVERLAY_ID);

export const useOpenMessagesWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const MessagesWindowController = opener.Controller;

export type MessagesWindowDefinitionData = OpenMessagesWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    messagesWindow: OverlayWire<MessagesWindowDefinitionData>;
  }
}
