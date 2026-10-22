"use client";

/**
 * Opener for the `agentFlexiblePanel` overlay.
 *
 * - `useOpenAgentFlexiblePanel()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentFlexiblePanelController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentFlexiblePanel" as const;

export interface OpenAgentFlexiblePanelOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  conversationId: string;
}

export interface AgentFlexiblePanelHandle {
  instanceId: string;
  close: () => void;
}

const opener = appOpener<OpenAgentFlexiblePanelOptions>(OVERLAY_ID, {
  multi: true,
});

export const useOpenAgentFlexiblePanel = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AgentFlexiblePanelController = opener.Controller;

export type AgentFlexiblePanelDefinitionData = OpenAgentFlexiblePanelOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentFlexiblePanel: OverlayWire<AgentFlexiblePanelDefinitionData>;
  }
}
