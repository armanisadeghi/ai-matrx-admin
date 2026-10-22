"use client";

/**
 * Opener for the `quickChatHistory` overlay.
 *
 * - `useOpenChatHistoryWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<ChatHistoryWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "quickChatHistory" as const;

export interface OpenChatHistoryWindowOptions {
  initialSelectedConversationId?: string | null;
  /** TODO: tighten to `GroupBy` once that type is imported. */
  initialGroupBy?: unknown;
}

export interface ChatHistoryWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenChatHistoryWindowOptions>(OVERLAY_ID);

export const useOpenChatHistoryWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const ChatHistoryWindowController = opener.Controller;

export type QuickChatHistoryDefinitionData = OpenChatHistoryWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    quickChatHistory: OverlayWire<QuickChatHistoryDefinitionData>;
  }
}
