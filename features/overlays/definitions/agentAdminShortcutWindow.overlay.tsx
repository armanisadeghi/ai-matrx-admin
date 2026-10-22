"use client";

/**
 * Opener for the `agentAdminShortcutWindow` overlay.
 *
 * - `useOpenAgentShortcutQuickCreateWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentShortcutQuickCreateWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentAdminShortcutWindow" as const;

export interface OpenAgentShortcutQuickCreateWindowOptions {
  agentId?: string | null;
  /** TODO: tighten to `QuickCreateTab` once that type is imported. */
  initialActiveTab?: unknown;
}

export interface AgentShortcutQuickCreateWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
const opener = appOpener<OpenAgentShortcutQuickCreateWindowOptions>(OVERLAY_ID);

export const createAgentShortcutQuickCreateWindowOpener = opener.forStore;

export const useOpenAgentShortcutQuickCreateWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AgentShortcutQuickCreateWindowController = opener.Controller;

export type AgentAdminShortcutWindowDefinitionData = OpenAgentShortcutQuickCreateWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentAdminShortcutWindow: OverlayWire<AgentAdminShortcutWindowDefinitionData>;
  }
}
