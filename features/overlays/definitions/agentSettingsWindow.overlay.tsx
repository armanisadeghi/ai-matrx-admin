"use client";

/**
 * Opener for the `agentSettingsWindow` overlay.
 *
 * - `useOpenAgentSettingsWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentSettingsWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentSettingsWindow" as const;

export interface OpenAgentSettingsWindowOptions {
  initialAgentId?: string;
  /**
   * When set, Agent Settings shows a Surface tab for this surface's
   * agent↔surface bindings (defaults the pane to Surface).
   */
  surfaceName?: string;
  /** Override which pane opens first when `surfaceName` is set. */
  initialView?: "info" | "surface";
}

export interface AgentSettingsWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
const opener = appOpener<OpenAgentSettingsWindowOptions>(OVERLAY_ID);

export const createAgentSettingsWindowOpener = opener.forStore;

export const useOpenAgentSettingsWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AgentSettingsWindowController = opener.Controller;

export type AgentSettingsWindowDefinitionData = OpenAgentSettingsWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentSettingsWindow: OverlayWire<AgentSettingsWindowDefinitionData>;
  }
}
