"use client";

/**
 * Opener for the `agentToastOverlay` overlay.
 *
 * - `useOpenAgentToastOverlay()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentToastOverlayController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentToastOverlay" as const;

export interface OpenAgentToastOverlayOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  conversationId: string;
  index?: number;
}

export interface AgentToastOverlayHandle {
  instanceId: string;
  close: () => void;
}

const opener = appOpener<OpenAgentToastOverlayOptions>(OVERLAY_ID, {
  multi: true,
});

export const useOpenAgentToastOverlay = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AgentToastOverlayController = opener.Controller;

export type AgentToastOverlayDefinitionData = OpenAgentToastOverlayOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentToastOverlay: OverlayWire<AgentToastOverlayDefinitionData>;
  }
}
