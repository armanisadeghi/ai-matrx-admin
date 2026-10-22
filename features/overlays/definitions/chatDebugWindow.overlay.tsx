"use client";

/**
 * Opener for the `chatDebugWindow` overlay.
 *
 * - `useOpenChatDebugWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<ChatDebugWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "chatDebugWindow" as const;

export interface OpenChatDebugWindowOptions {
  sessionId: string | null;
}

export interface ChatDebugWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
const opener = appOpener<OpenChatDebugWindowOptions>(OVERLAY_ID);

export const createChatDebugWindowOpener = opener.forStore;

export const useOpenChatDebugWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const ChatDebugWindowController = opener.Controller;

export type ChatDebugWindowDefinitionData = OpenChatDebugWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    chatDebugWindow: OverlayWire<ChatDebugWindowDefinitionData>;
  }
}
