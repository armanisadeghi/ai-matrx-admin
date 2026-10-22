"use client";

/**
 * Opener for the `agentGateWindow` overlay.
 *
 * - `useOpenAgentGateWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentGateWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentGateWindow" as const;

export interface OpenAgentGateWindowOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  conversationId: string;
  /** TODO: tighten to `OverlayId` once that type is imported. */
  downstreamOverlayId?: unknown;
}

export interface AgentGateWindowHandle {
  instanceId: string;
  close: () => void;
}

const opener = appOpener<OpenAgentGateWindowOptions>(OVERLAY_ID, {
  multi: true,
});

export const useOpenAgentGateWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AgentGateWindowController = opener.Controller;

export type AgentGateWindowDefinitionData = OpenAgentGateWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentGateWindow: OverlayWire<AgentGateWindowDefinitionData>;
  }
}
