"use client";

/**
 * Opener for the `agentChatCollapsible` overlay.
 *
 * - `useOpenChatCollapsible()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<ChatCollapsibleController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentChatCollapsible" as const;

export interface OpenChatCollapsibleOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  conversationId: string;
}

export interface ChatCollapsibleHandle {
  instanceId: string;
  close: () => void;
}

const opener = appOpener<OpenChatCollapsibleOptions>(OVERLAY_ID, {
  multi: true,
});

export const useOpenChatCollapsible = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const ChatCollapsibleController = opener.Controller;

export type AgentChatCollapsibleDefinitionData = OpenChatCollapsibleOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentChatCollapsible: OverlayWire<AgentChatCollapsibleDefinitionData>;
  }
}
