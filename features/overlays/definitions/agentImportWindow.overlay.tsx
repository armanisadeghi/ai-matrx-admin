"use client";

/**
 * Opener for the `agentImportWindow` overlay.
 *
 * - `useOpenAgentImportWindow()` — imperative hook. Call to open with typed options;
 *   returns a handle with a `close()` method.
 * - `<AgentImportWindowController />` — declarative wrapper. Mount to open,
 *   unmount to close. Equivalent ergonomics to rendering a normal component.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentImportWindow" as const;

export interface OpenAgentImportWindowOptions {
}

export interface AgentImportWindowHandle {
  close: () => void;
}

export function useOpenAgentImportWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAgentImportWindowOptions = {}): AgentImportWindowHandle => {
      dispatch(openOverlay({ overlayId: OVERLAY_ID }));
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
export function AgentImportWindowController(props: OpenAgentImportWindowOptions): null {
  const open = useOpenAgentImportWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentImportWindowDefinitionData = OpenAgentImportWindowOptions;

export const agentImportWindowOverlay = /* @__PURE__ */ defineOverlay<AgentImportWindowDefinitionData>()({
  id: "agentImportWindow",
  label: "Agent Import Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { selectedSource: "agent-json", pastedText: "" },
    windowId: "agent-import-window",
    mobile: "drawer",
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentImportWindow: OverlayWire<AgentImportWindowDefinitionData>;
  }
}
