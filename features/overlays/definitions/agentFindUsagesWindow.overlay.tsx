"use client";

/**
 * Opener for the `agentFindUsagesWindow` overlay.
 *
 * - `useOpenAgentFindUsagesWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentFindUsagesWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentFindUsagesWindow" as const;

export interface OpenAgentFindUsagesWindowOptions {
  agentId?: string | null;
}

export interface AgentFindUsagesWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
const opener = appOpener<OpenAgentFindUsagesWindowOptions>(OVERLAY_ID);

export const createAgentFindUsagesWindowOpener = opener.forStore;

export const useOpenAgentFindUsagesWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AgentFindUsagesWindowController = opener.Controller;

export type AgentFindUsagesWindowDefinitionData = OpenAgentFindUsagesWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentFindUsagesWindow: OverlayWire<AgentFindUsagesWindowDefinitionData>;
  }
}
