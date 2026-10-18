"use client";

/**
 * Opener for the `agentAdminFindUsagesWindow` overlay.
 *
 * - `useOpenAgentAdminFindUsagesWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentAdminFindUsagesWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentAdminFindUsagesWindow" as const;

export interface OpenAgentAdminFindUsagesWindowOptions {
  agentId?: string | null;
}

export interface AgentAdminFindUsagesWindowHandle {
  close: () => void;
}

export function useOpenAgentAdminFindUsagesWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAgentAdminFindUsagesWindowOptions = {}): AgentAdminFindUsagesWindowHandle => {
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
export function AgentAdminFindUsagesWindowController(props: OpenAgentAdminFindUsagesWindowOptions): null {
  const open = useOpenAgentAdminFindUsagesWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.agentId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentAdminFindUsagesWindowDefinitionData = OpenAgentAdminFindUsagesWindowOptions;

export const agentAdminFindUsagesWindowOverlay = /* @__PURE__ */ defineOverlay<AgentAdminFindUsagesWindowDefinitionData>()({
  id: "agentAdminFindUsagesWindow",
  label: "Agent Admin Find Usages Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { agentId: null },
    windowId: "agent-admin-find-usages-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentAdminFindUsagesWindow: OverlayWire<AgentAdminFindUsagesWindowDefinitionData>;
  }
}
