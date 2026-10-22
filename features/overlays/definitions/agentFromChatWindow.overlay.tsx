"use client";

/**
 * Opener for the `agentFromChatWindow` overlay — "Make an agent from this chat".
 *
 * - `useOpenAgentFromChatWindow()` — imperative hook; returns a handle with `close()`.
 * - `<AgentFromChatWindowController />` — declarative wrapper.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentFromChatWindow" as const;

export interface OpenAgentFromChatWindowOptions {
  conversationId: string;
  conversationTitle?: string | null;
}

export interface AgentFromChatWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenAgentFromChatWindowOptions>(OVERLAY_ID, {
  data: (opts: OpenAgentFromChatWindowOptions) => ({
            conversationId: opts.conversationId,
            conversationTitle: opts.conversationTitle ?? null,
          }),
});

export const useOpenAgentFromChatWindow = opener.useOpen;

export const AgentFromChatWindowController = opener.Controller;

export type AgentFromChatWindowDefinitionData = OpenAgentFromChatWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentFromChatWindow: OverlayWire<AgentFromChatWindowDefinitionData>;
  }
}
