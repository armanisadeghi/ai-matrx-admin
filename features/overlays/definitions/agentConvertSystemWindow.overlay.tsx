"use client";

/**
 * Opener for the `agentConvertSystemWindow` overlay.
 *
 * - `useOpenAgentConvertSystemWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentConvertSystemWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import type { AnyMandateKey } from "@ai-matrx/agents/mandates";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentConvertSystemWindow" as const;

export interface OpenAgentConvertSystemWindowOptions {
  agentId?: string | null;
  /** Optional agent-mandate context (admin mandates console) — serializable only.
   * When set, the sync window names the mandate and offers an in-diff rebind. */
  mandateId?: string | null;
  mandateKey?: AnyMandateKey | null;
  mandateLabel?: string | null;
}

export interface AgentConvertSystemWindowHandle {
  close: () => void;
}

export function useOpenAgentConvertSystemWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAgentConvertSystemWindowOptions = {}): AgentConvertSystemWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            agentId: opts.agentId,
            mandateId: opts.mandateId,
            mandateKey: opts.mandateKey,
            mandateLabel: opts.mandateLabel,
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
export function AgentConvertSystemWindowController(props: OpenAgentConvertSystemWindowOptions): null {
  const open = useOpenAgentConvertSystemWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.agentId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentConvertSystemWindowDefinitionData = OpenAgentConvertSystemWindowOptions;

export const agentConvertSystemWindowOverlay = /* @__PURE__ */ defineOverlay<AgentConvertSystemWindowDefinitionData>()({
  id: "agentConvertSystemWindow",
  label: "Agent Convert System Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { agentId: null },
    windowId: "agent-convert-system-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentConvertSystemWindow: OverlayWire<AgentConvertSystemWindowDefinitionData>;
  }
}
