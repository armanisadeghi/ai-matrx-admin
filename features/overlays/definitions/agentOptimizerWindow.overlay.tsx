"use client";

/**
 * Opener for the `agentOptimizerWindow` overlay.
 *
 * - `useOpenAgentOptimizerWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentOptimizerWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentOptimizerWindow" as const;

export interface OpenAgentOptimizerWindowOptions {
  agentId?: string | null;
}

export interface AgentOptimizerWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
const opener = appOpener<OpenAgentOptimizerWindowOptions>(OVERLAY_ID);

export const createAgentOptimizerWindowOpener = opener.forStore;

export const useOpenAgentOptimizerWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AgentOptimizerWindowController = opener.Controller;

export type AgentOptimizerWindowDefinitionData = OpenAgentOptimizerWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentOptimizerWindow: OverlayWire<AgentOptimizerWindowDefinitionData>;
  }
}
