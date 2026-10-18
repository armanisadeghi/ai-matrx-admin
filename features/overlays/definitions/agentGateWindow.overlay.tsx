"use client";

/**
 * Opener for the `agentGateWindow` overlay.
 *
 * - `useOpenAgentGateWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentGateWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentGateWindow" as const;

export interface OpenAgentGateWindowOptions {
  /** Optional stable instance id. Omit to spawn a fresh instance. */
  instanceId?: string;
  conversationId: string;
  /** TODO: tighten to `OverlayId` once that type is imported. */
  downstreamOverlayId?: unknown;
}

export interface AgentGateWindowHandle {
  instanceId: string;
  close: () => void;
}

export function useOpenAgentGateWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAgentGateWindowOptions): AgentGateWindowHandle => {
      const instanceId = opts.instanceId ?? `agentGateWindow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          instanceId,
          data: {
            conversationId: opts.conversationId,
            downstreamOverlayId: opts.downstreamOverlayId,
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
export function AgentGateWindowController(props: OpenAgentGateWindowOptions): null {
  const open = useOpenAgentGateWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.conversationId, props.downstreamOverlayId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentGateWindowDefinitionData = OpenAgentGateWindowOptions;

export const agentGateWindowOverlay = /* @__PURE__ */ defineOverlay<AgentGateWindowDefinitionData>()({
  id: "agentGateWindow",
  label: "Agent Gate Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { conversationId: null },
    windowId: "agent-gate-window",
    mobile: "fullscreen",
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentGateWindow: OverlayWire<AgentGateWindowDefinitionData>;
  }
}
