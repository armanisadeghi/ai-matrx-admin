"use client";

/**
 * Opener for the `agentRunHistoryWindow` overlay.
 *
 * - `useOpenAgentRunHistoryWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentRunHistoryWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentRunHistoryWindow" as const;

export interface OpenAgentRunHistoryWindowOptions {
  agentId?: string | null;
  initialSelectedConversationId?: string | null;
  /**
   * What the history is OF, in the person's words — the window reads
   * "Run History — <subject>". An Applet passes its own name; without it
   * the window names the agent (an app's agent is often unnamed: "— Agent").
   */
  subject?: string | null;
}

export interface AgentRunHistoryWindowHandle {
  close: () => void;
}

/** The opener as a plain function of the store (no hook): what the lazy chat opener set calls. */
const opener = appOpener<OpenAgentRunHistoryWindowOptions>(OVERLAY_ID, {
  data: (opts: OpenAgentRunHistoryWindowOptions = {}) => ({
          agentId: opts.agentId,
          initialSelectedConversationId: opts.initialSelectedConversationId,
          subject: opts.subject ?? null,
        }),
});

export const createAgentRunHistoryWindowOpener = opener.forStore;

export const useOpenAgentRunHistoryWindow = opener.useOpen;

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export const AgentRunHistoryWindowController = opener.Controller;

export type AgentRunHistoryWindowDefinitionData = OpenAgentRunHistoryWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentRunHistoryWindow: OverlayWire<AgentRunHistoryWindowDefinitionData>;
  }
}
