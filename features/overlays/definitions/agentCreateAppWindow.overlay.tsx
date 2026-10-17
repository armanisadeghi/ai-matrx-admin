"use client";

/**
 * Opener for the `agentCreateAppWindow` overlay.
 *
 * - `useOpenAgentCreateAppWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentCreateAppWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentCreateAppWindow" as const;

export type OpenAgentCreateAppWindowOptions = Record<string, never>;

export interface AgentCreateAppWindowHandle {
  close: () => void;
}

export function useOpenAgentCreateAppWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (_opts: OpenAgentCreateAppWindowOptions = {}): AgentCreateAppWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
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
export function AgentCreateAppWindowController(props: OpenAgentCreateAppWindowOptions): null {
  const open = useOpenAgentCreateAppWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentCreateAppWindowDefinitionData = OpenAgentCreateAppWindowOptions;

export const agentCreateAppWindowOverlay = defineOverlay<AgentCreateAppWindowDefinitionData>()({
  id: "agentCreateAppWindow",
  label: "Agent Create App Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "agent-create-app-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
  render: () => import("./agentCreateAppWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentCreateAppWindow: OverlayWire<AgentCreateAppWindowDefinitionData>;
  }
}
