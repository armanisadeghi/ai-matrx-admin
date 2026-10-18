"use client";

/**
 * Opener for the `agentFlexiblePanel` overlay.
 *
 * - `useOpenAgentFlexiblePanel()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentFlexiblePanelController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentFlexiblePanel" as const;

export interface OpenAgentFlexiblePanelOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  conversationId: string;
}

export interface AgentFlexiblePanelHandle {
  instanceId: string;
  close: () => void;
}

export function useOpenAgentFlexiblePanel() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAgentFlexiblePanelOptions): AgentFlexiblePanelHandle => {
      const instanceId = opts.instanceId ?? `agentFlexiblePanel-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
export function AgentFlexiblePanelController(props: OpenAgentFlexiblePanelOptions): null {
  const open = useOpenAgentFlexiblePanel();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.conversationId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentFlexiblePanelDefinitionData = OpenAgentFlexiblePanelOptions;

export const agentFlexiblePanelOverlay = /* @__PURE__ */ defineOverlay<AgentFlexiblePanelDefinitionData>()({
  id: "agentFlexiblePanel",
  label: "Agent Flexible Panel",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "agent-flexible-panel",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentFlexiblePanel: OverlayWire<AgentFlexiblePanelDefinitionData>;
  }
}
