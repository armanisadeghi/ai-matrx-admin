"use client";

/**
 * Opener for the `agentAssistantMarkdownDebugWindow` overlay.
 *
 * - `useOpenAgentAssistantMarkdownDebugWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentAssistantMarkdownDebugWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentAssistantMarkdownDebugWindow" as const;

export interface OpenAgentAssistantMarkdownDebugWindowOptions {
}

export interface AgentAssistantMarkdownDebugWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenAgentAssistantMarkdownDebugWindowOptions>(OVERLAY_ID, {
  data: () => ({}),
});

export const useOpenAgentAssistantMarkdownDebugWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AgentAssistantMarkdownDebugWindowController = opener.Controller;

export type AgentAssistantMarkdownDebugWindowDefinitionData = OpenAgentAssistantMarkdownDebugWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentAssistantMarkdownDebugWindow: OverlayWire<AgentAssistantMarkdownDebugWindowDefinitionData>;
  }
}
