"use client";

/**
 * Opener for the `agentSidebarOverlay` overlay.
 *
 * - `useOpenAgentSidebarOverlay()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentSidebarOverlayController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentSidebarOverlay" as const;

export interface OpenAgentSidebarOverlayOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  conversationId: string;
}

export interface AgentSidebarOverlayHandle {
  instanceId: string;
  close: () => void;
}

export function useOpenAgentSidebarOverlay() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAgentSidebarOverlayOptions): AgentSidebarOverlayHandle => {
      const instanceId = opts.instanceId ?? `agentSidebarOverlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          instanceId,
          data: {
            conversationId: opts.conversationId,
          },
        }),
      );
      return {
        instanceId,
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID, instanceId })),
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
export function AgentSidebarOverlayController(props: OpenAgentSidebarOverlayOptions): null {
  const open = useOpenAgentSidebarOverlay();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.conversationId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentSidebarOverlayDefinitionData = OpenAgentSidebarOverlayOptions;

export const agentSidebarOverlayOverlay = /* @__PURE__ */ defineOverlay<AgentSidebarOverlayDefinitionData>()({
  id: "agentSidebarOverlay",
  label: "Agent Sidebar Overlay",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentSidebarOverlay: OverlayWire<AgentSidebarOverlayDefinitionData>;
  }
}
