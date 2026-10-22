"use client";

/**
 * Opener for the `agentSidebarOverlay` overlay.
 *
 * - `useOpenAgentSidebarOverlay()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentSidebarOverlayController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentSidebarOverlay" as const;

export interface OpenAgentSidebarOverlayOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  conversationId: string;
}

export interface AgentSidebarOverlayHandle {
  instanceId: string;
  close: () => void;
}

const opener = appOpener<OpenAgentSidebarOverlayOptions>(OVERLAY_ID, {
  multi: true,
});

export const useOpenAgentSidebarOverlay = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AgentSidebarOverlayController = opener.Controller;

export type AgentSidebarOverlayDefinitionData = OpenAgentSidebarOverlayOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentSidebarOverlay: OverlayWire<AgentSidebarOverlayDefinitionData>;
  }
}
