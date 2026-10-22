"use client";

/**
 * Opener for the `agentFullModal` overlay.
 *
 * - `useOpenAgentFullModal()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentFullModalController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentFullModal" as const;

export interface OpenAgentFullModalOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  conversationId: string;
}

export interface AgentFullModalHandle {
  instanceId: string;
  close: () => void;
}

const opener = appOpener<OpenAgentFullModalOptions>(OVERLAY_ID, {
  multi: true,
});

export const useOpenAgentFullModal = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AgentFullModalController = opener.Controller;

export type AgentFullModalDefinitionData = OpenAgentFullModalOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentFullModal: OverlayWire<AgentFullModalDefinitionData>;
  }
}
