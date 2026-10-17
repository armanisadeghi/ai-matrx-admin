"use client";

/**
 * Opener for the `agentInlineOverlay` overlay.
 *
 * - `useOpenAgentInlineOverlay()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentInlineOverlayController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentInlineOverlay" as const;

export interface OpenAgentInlineOverlayOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  conversationId: string;
}

export interface AgentInlineOverlayHandle {
  instanceId: string;
  close: () => void;
}

export function useOpenAgentInlineOverlay() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAgentInlineOverlayOptions): AgentInlineOverlayHandle => {
      const instanceId = opts.instanceId ?? `agentInlineOverlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
export function AgentInlineOverlayController(props: OpenAgentInlineOverlayOptions): null {
  const open = useOpenAgentInlineOverlay();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.conversationId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentInlineOverlayDefinitionData = OpenAgentInlineOverlayOptions;

export const agentInlineOverlayOverlay = defineOverlay<AgentInlineOverlayDefinitionData>()({
  id: "agentInlineOverlay",
  label: "Agent Inline Overlay",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  render: () => import("./agentInlineOverlay.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentInlineOverlay: OverlayWire<AgentInlineOverlayDefinitionData>;
  }
}
