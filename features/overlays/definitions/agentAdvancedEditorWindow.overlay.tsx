"use client";

/**
 * Opener for the `agentAdvancedEditorWindow` overlay.
 *
 * - `useOpenAgentContentWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentContentWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentAdvancedEditorWindow" as const;

export interface OpenAgentContentWindowOptions {
  initialAgentId?: string | null;
  /** TODO: tighten to `AgentContentTab` once that type is imported. */
  initialTab?: unknown;
  /** TODO: tighten to `AgentContentTab[]` once that type is imported. */
  tabs?: unknown;
  multiAgentMode?: boolean;
}

export interface AgentContentWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
const opener = appOpener<OpenAgentContentWindowOptions>(OVERLAY_ID);

export const createAgentContentWindowOpener = opener.forStore;

export const useOpenAgentContentWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AgentContentWindowController = opener.Controller;

export type AgentAdvancedEditorWindowDefinitionData = OpenAgentContentWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentAdvancedEditorWindow: OverlayWire<AgentAdvancedEditorWindowDefinitionData>;
  }
}
