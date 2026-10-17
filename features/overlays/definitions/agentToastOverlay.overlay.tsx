"use client";

/**
 * Opener for the `agentToastOverlay` overlay.
 *
 * - `useOpenAgentToastOverlay()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentToastOverlayController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentToastOverlay" as const;

export interface OpenAgentToastOverlayOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  conversationId: string;
  index?: number;
}

export interface AgentToastOverlayHandle {
  instanceId: string;
  close: () => void;
}

export function useOpenAgentToastOverlay() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAgentToastOverlayOptions): AgentToastOverlayHandle => {
      const instanceId = opts.instanceId ?? `agentToastOverlay-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          instanceId,
          data: {
            conversationId: opts.conversationId,
            index: opts.index,
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
export function AgentToastOverlayController(props: OpenAgentToastOverlayOptions): null {
  const open = useOpenAgentToastOverlay();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.conversationId, props.index]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentToastOverlayDefinitionData = OpenAgentToastOverlayOptions;

export const agentToastOverlayOverlay = defineOverlay<AgentToastOverlayDefinitionData>()({
  id: "agentToastOverlay",
  label: "Agent Toast Overlay",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  render: () => import("./agentToastOverlay.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentToastOverlay: OverlayWire<AgentToastOverlayDefinitionData>;
  }
}
