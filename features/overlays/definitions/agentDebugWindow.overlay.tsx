"use client";

/**
 * Opener for the `agentDebugWindow` overlay.
 *
 * - `useOpenAgentDebugWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentDebugWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentDebugWindow" as const;

export interface OpenAgentDebugWindowOptions {
  initialAgentId?: string | null;
  initialConversationId?: string | null;
}

export interface AgentDebugWindowHandle {
  close: () => void;
}

export function useOpenAgentDebugWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAgentDebugWindowOptions = {}): AgentDebugWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            initialAgentId: opts.initialAgentId,
            initialConversationId: opts.initialConversationId,
          },
        }),
      );
      return {
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
      };
    },
    [dispatch],
  );
}

/**
 * Declarative form. Renders nothing visible; opens the overlay on mount,
 * closes it on unmount. Use this when a caller wants to express overlay
 * state declaratively (the way they'd render a normal component).
 */
export function AgentDebugWindowController(props: OpenAgentDebugWindowOptions): null {
  const open = useOpenAgentDebugWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.initialAgentId, props.initialConversationId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentDebugWindowDefinitionData = OpenAgentDebugWindowOptions;

export const agentDebugWindowOverlay = /* @__PURE__ */ defineOverlay<AgentDebugWindowDefinitionData>()({
  id: "agentDebugWindow",
  label: "Agent Debug Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { initialAgentId: null, initialConversationId: null },
    windowId: "agent-debug-window",
    mobile: "card",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentDebugWindow: OverlayWire<AgentDebugWindowDefinitionData>;
  }
}
