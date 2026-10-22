"use client";

/**
 * Opener for the `agentConnectionsWindow` overlay.
 *
 * - `useOpenAgentConnectionsWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentConnectionsWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentConnectionsWindow" as const;

export interface OpenAgentConnectionsWindowOptions {
  /** TODO: tighten to `AgentConnectionsSection` once that type is imported. */
  initialSection?: unknown;
  /** TODO: tighten to `Scope` once that type is imported. */
  initialScope?: unknown;
  initialSelectedItemId?: string | null;
}

export interface AgentConnectionsWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenAgentConnectionsWindowOptions>(OVERLAY_ID);

export const useOpenAgentConnectionsWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AgentConnectionsWindowController = opener.Controller;

export type AgentConnectionsWindowDefinitionData = OpenAgentConnectionsWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentConnectionsWindow: OverlayWire<AgentConnectionsWindowDefinitionData>;
  }
}
