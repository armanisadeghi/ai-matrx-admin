"use client";

/**
 * Opener for the `agentInterfaceVariationsWindow` overlay.
 *
 * - `useOpenAgentInterfaceVariationsWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentInterfaceVariationsWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentInterfaceVariationsWindow" as const;

export interface OpenAgentInterfaceVariationsWindowOptions {
  agentId?: string | null;
}

export interface AgentInterfaceVariationsWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
const opener = appOpener<OpenAgentInterfaceVariationsWindowOptions>(OVERLAY_ID);

export const createAgentInterfaceVariationsWindowOpener = opener.forStore;

export const useOpenAgentInterfaceVariationsWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AgentInterfaceVariationsWindowController = opener.Controller;

export type AgentInterfaceVariationsWindowDefinitionData = OpenAgentInterfaceVariationsWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentInterfaceVariationsWindow: OverlayWire<AgentInterfaceVariationsWindowDefinitionData>;
  }
}
