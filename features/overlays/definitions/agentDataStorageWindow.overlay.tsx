"use client";

/**
 * Opener for the `agentDataStorageWindow` overlay.
 *
 * - `useOpenAgentDataStorageWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentDataStorageWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentDataStorageWindow" as const;

export interface OpenAgentDataStorageWindowOptions {
  agentId?: string | null;
}

export interface AgentDataStorageWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
const opener = appOpener<OpenAgentDataStorageWindowOptions>(OVERLAY_ID);

export const createAgentDataStorageWindowOpener = opener.forStore;

export const useOpenAgentDataStorageWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AgentDataStorageWindowController = opener.Controller;

export type AgentDataStorageWindowDefinitionData = OpenAgentDataStorageWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentDataStorageWindow: OverlayWire<AgentDataStorageWindowDefinitionData>;
  }
}
