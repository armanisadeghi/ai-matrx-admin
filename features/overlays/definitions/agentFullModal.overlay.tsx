"use client";

/**
 * Opener for the `agentFullModal` overlay.
 *
 * - `useOpenAgentFullModal()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentFullModalController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentFullModal" as const;

export interface OpenAgentFullModalOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  conversationId: string;
}

export interface AgentFullModalHandle {
  instanceId: string;
  close: () => void;
}

export function useOpenAgentFullModal() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAgentFullModalOptions): AgentFullModalHandle => {
      const instanceId = opts.instanceId ?? `agentFullModal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
export function AgentFullModalController(props: OpenAgentFullModalOptions): null {
  const open = useOpenAgentFullModal();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.conversationId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentFullModalDefinitionData = OpenAgentFullModalOptions;

export const agentFullModalOverlay = /* @__PURE__ */ defineOverlay<AgentFullModalDefinitionData>()({
  id: "agentFullModal",
  label: "Agent Full Modal",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentFullModal: OverlayWire<AgentFullModalDefinitionData>;
  }
}
