"use client";

/**
 * Opener for the `agentFloatingChat` overlay.
 *
 * - `useOpenAgentFloatingChat()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentFloatingChatController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentFloatingChat" as const;

export interface OpenAgentFloatingChatOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  conversationId: string;
}

export interface AgentFloatingChatHandle {
  instanceId: string;
  close: () => void;
}

const opener = appOpener<OpenAgentFloatingChatOptions>(OVERLAY_ID, {
  multi: true,
});

export const useOpenAgentFloatingChat = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AgentFloatingChatController = opener.Controller;

export type AgentFloatingChatDefinitionData = OpenAgentFloatingChatOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentFloatingChat: OverlayWire<AgentFloatingChatDefinitionData>;
  }
}
