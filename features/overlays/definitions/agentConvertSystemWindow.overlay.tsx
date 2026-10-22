"use client";

/**
 * Opener for the `agentConvertSystemWindow` overlay.
 *
 * - `useOpenAgentConvertSystemWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentConvertSystemWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { AnyMandateKey } from "@ai-matrx/agents/mandates";
import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentConvertSystemWindow" as const;

export interface OpenAgentConvertSystemWindowOptions {
  agentId?: string | null;
  /** Optional agent-mandate context (admin mandates console) — serializable only.
   * When set, the sync window names the mandate and offers an in-diff rebind. */
  mandateId?: string | null;
  mandateKey?: AnyMandateKey | null;
  mandateLabel?: string | null;
}

export interface AgentConvertSystemWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
const opener = appOpener<OpenAgentConvertSystemWindowOptions>(OVERLAY_ID);

export const createAgentConvertSystemWindowOpener = opener.forStore;

export const useOpenAgentConvertSystemWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AgentConvertSystemWindowController = opener.Controller;

export type AgentConvertSystemWindowDefinitionData = OpenAgentConvertSystemWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentConvertSystemWindow: OverlayWire<AgentConvertSystemWindowDefinitionData>;
  }
}
