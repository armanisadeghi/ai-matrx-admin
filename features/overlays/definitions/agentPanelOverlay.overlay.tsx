"use client";

/**
 * Opener for the `agentPanelOverlay` overlay.
 *
 * - `useOpenAgentPanelOverlay()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentPanelOverlayController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentPanelOverlay" as const;

export interface OpenAgentPanelOverlayOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  conversationId: string;
}

export interface AgentPanelOverlayHandle {
  instanceId: string;
  close: () => void;
}

const opener = appOpener<OpenAgentPanelOverlayOptions>(OVERLAY_ID, {
  multi: true,
});

export const useOpenAgentPanelOverlay = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AgentPanelOverlayController = opener.Controller;

export type AgentPanelOverlayDefinitionData = OpenAgentPanelOverlayOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentPanelOverlay: OverlayWire<AgentPanelOverlayDefinitionData>;
  }
}
