"use client";

/**
 * Opener for the `agentRunHistoryWindow` overlay.
 *
 * - `useOpenAgentRunHistoryWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentRunHistoryWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useEffect, useMemo } from "react";
import { useAppStore } from "@/lib/redux/hooks";
import type { AppStore } from "@/lib/redux/store";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { OverlayWire } from "./overlay-types";

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
export function createAgentRunHistoryWindowOpener(store: AppStore) {
  const dispatch = store.dispatch;
  return (opts: OpenAgentRunHistoryWindowOptions = {}): AgentRunHistoryWindowHandle => {
    dispatch(
      openOverlay({
        overlayId: OVERLAY_ID,
        data: {
          agentId: opts.agentId,
          initialSelectedConversationId: opts.initialSelectedConversationId,
          subject: opts.subject ?? null,
        },
      }),
    );
    return {
      close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
    };
  };
}

export function useOpenAgentRunHistoryWindow() {
  const store = useAppStore();
  return useMemo(() => createAgentRunHistoryWindowOpener(store), [store]);
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export function AgentRunHistoryWindowController(props: OpenAgentRunHistoryWindowOptions): null {
  const open = useOpenAgentRunHistoryWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.agentId, props.initialSelectedConversationId, props.subject]);
  return null;
}

export type AgentRunHistoryWindowDefinitionData = OpenAgentRunHistoryWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentRunHistoryWindow: OverlayWire<AgentRunHistoryWindowDefinitionData>;
  }
}
