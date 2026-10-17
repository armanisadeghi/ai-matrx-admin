"use client";

/**
 * Opener for the `agentPanelOverlay` overlay.
 *
 * - `useOpenAgentPanelOverlay()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentPanelOverlayController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentPanelOverlay" as const;

export interface OpenAgentPanelOverlayOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  conversationId: string;
}

export interface AgentPanelOverlayHandle {
  instanceId: string;
  close: () => void;
}

export function useOpenAgentPanelOverlay() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAgentPanelOverlayOptions): AgentPanelOverlayHandle => {
      const instanceId = opts.instanceId ?? `agentPanelOverlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
export function AgentPanelOverlayController(props: OpenAgentPanelOverlayOptions): null {
  const open = useOpenAgentPanelOverlay();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.conversationId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentPanelOverlayDefinitionData = OpenAgentPanelOverlayOptions;

export const agentPanelOverlayOverlay = defineOverlay<AgentPanelOverlayDefinitionData>()({
  id: "agentPanelOverlay",
  label: "Agent Panel Overlay",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  render: () => import("./agentPanelOverlay.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentPanelOverlay: OverlayWire<AgentPanelOverlayDefinitionData>;
  }
}
