"use client";

/**
 * Opener for the `agentInterfaceVariationsWindow` overlay.
 *
 * - `useOpenAgentInterfaceVariationsWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentInterfaceVariationsWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentInterfaceVariationsWindow" as const;

export interface OpenAgentInterfaceVariationsWindowOptions {
  agentId?: string | null;
}

export interface AgentInterfaceVariationsWindowHandle {
  close: () => void;
}

export function useOpenAgentInterfaceVariationsWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAgentInterfaceVariationsWindowOptions = {}): AgentInterfaceVariationsWindowHandle => {
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
export function AgentInterfaceVariationsWindowController(props: OpenAgentInterfaceVariationsWindowOptions): null {
  const open = useOpenAgentInterfaceVariationsWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.agentId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentInterfaceVariationsWindowDefinitionData = OpenAgentInterfaceVariationsWindowOptions;

export const agentInterfaceVariationsWindowOverlay = /* @__PURE__ */ defineOverlay<AgentInterfaceVariationsWindowDefinitionData>()({
  id: "agentInterfaceVariationsWindow",
  label: "Agent Interface Variations Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { agentId: null },
    windowId: "agent-interface-variations-window",
    mobile: "fullscreen",
    ephemeral: true,
    deprecated: { reason: "Stub — not yet implemented. Will be removed if no implementation lands." },
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentInterfaceVariationsWindow: OverlayWire<AgentInterfaceVariationsWindowDefinitionData>;
  }
}
