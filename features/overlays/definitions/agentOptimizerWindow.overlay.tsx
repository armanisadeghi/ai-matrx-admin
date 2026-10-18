"use client";

/**
 * Opener for the `agentOptimizerWindow` overlay.
 *
 * - `useOpenAgentOptimizerWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentOptimizerWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentOptimizerWindow" as const;

export interface OpenAgentOptimizerWindowOptions {
  agentId?: string | null;
}

export interface AgentOptimizerWindowHandle {
  close: () => void;
}

export function useOpenAgentOptimizerWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAgentOptimizerWindowOptions = {}): AgentOptimizerWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            agentId: opts.agentId,
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
export function AgentOptimizerWindowController(props: OpenAgentOptimizerWindowOptions): null {
  const open = useOpenAgentOptimizerWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.agentId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentOptimizerWindowDefinitionData = OpenAgentOptimizerWindowOptions;

export const agentOptimizerWindowOverlay = /* @__PURE__ */ defineOverlay<AgentOptimizerWindowDefinitionData>()({
  id: "agentOptimizerWindow",
  label: "Agent Optimizer Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { agentId: null },
    windowId: "agent-optimizer-window",
    mobile: "fullscreen",
    ephemeral: true,
    deprecated: { reason: "Stub — not yet implemented. Will be removed if no implementation lands." },
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentOptimizerWindow: OverlayWire<AgentOptimizerWindowDefinitionData>;
  }
}
