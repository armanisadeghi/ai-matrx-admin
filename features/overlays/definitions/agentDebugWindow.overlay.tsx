"use client";

/**
 * Opener for the `agentDebugWindow` overlay.
 *
 * - `useOpenAgentDebugWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentDebugWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentDebugWindow" as const;

export interface OpenAgentDebugWindowOptions {
  initialAgentId?: string | null;
  initialConversationId?: string | null;
}

export interface AgentDebugWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenAgentDebugWindowOptions>(OVERLAY_ID);

export const useOpenAgentDebugWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AgentDebugWindowController = opener.Controller;

export type AgentDebugWindowDefinitionData = OpenAgentDebugWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentDebugWindow: OverlayWire<AgentDebugWindowDefinitionData>;
  }
}
