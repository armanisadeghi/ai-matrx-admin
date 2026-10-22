"use client";

/**
 * Opener for the `agentChatBubble` overlay.
 *
 * - `useOpenAgentChatBubble()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentChatBubbleController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentChatBubble" as const;

export interface OpenAgentChatBubbleOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  conversationId: string;
}

export interface AgentChatBubbleHandle {
  instanceId: string;
  close: () => void;
}

const opener = appOpener<OpenAgentChatBubbleOptions>(OVERLAY_ID, {
  multi: true,
});

export const useOpenAgentChatBubble = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AgentChatBubbleController = opener.Controller;

export type AgentChatBubbleDefinitionData = OpenAgentChatBubbleOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentChatBubble: OverlayWire<AgentChatBubbleDefinitionData>;
  }
}
