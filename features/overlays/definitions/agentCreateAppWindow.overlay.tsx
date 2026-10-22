"use client";

/**
 * Opener for the `agentCreateAppWindow` overlay.
 *
 * - `useOpenAgentCreateAppWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentCreateAppWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentCreateAppWindow" as const;

export type OpenAgentCreateAppWindowOptions = Record<string, never>;

export interface AgentCreateAppWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
const opener = appOpener<OpenAgentCreateAppWindowOptions>(OVERLAY_ID, {
  data: () => ({}),
});

export const createAgentCreateAppWindowOpener = opener.forStore;

export const useOpenAgentCreateAppWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AgentCreateAppWindowController = opener.Controller;

export type AgentCreateAppWindowDefinitionData = OpenAgentCreateAppWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentCreateAppWindow: OverlayWire<AgentCreateAppWindowDefinitionData>;
  }
}
