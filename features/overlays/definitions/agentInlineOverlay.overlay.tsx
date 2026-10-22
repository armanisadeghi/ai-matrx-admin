"use client";

/**
 * Opener for the `agentInlineOverlay` overlay.
 *
 * - `useOpenAgentInlineOverlay()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentInlineOverlayController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentInlineOverlay" as const;

export interface OpenAgentInlineOverlayOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  conversationId: string;
}

export interface AgentInlineOverlayHandle {
  instanceId: string;
  close: () => void;
}

const opener = appOpener<OpenAgentInlineOverlayOptions>(OVERLAY_ID, {
  multi: true,
});

export const useOpenAgentInlineOverlay = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AgentInlineOverlayController = opener.Controller;

export type AgentInlineOverlayDefinitionData = OpenAgentInlineOverlayOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentInlineOverlay: OverlayWire<AgentInlineOverlayDefinitionData>;
  }
}
