"use client";

/**
 * Opener for the `agentAdvancedSettingsWindow` overlay.
 *
 * - `useOpenAgentAdvancedSettingsWindow()` — imperative hook; opens with the agent id.
 * - `<AgentAdvancedSettingsWindowController />` — declarative wrapper.
 *
 * Hand-maintained opener — see features/overlays/FEATURE.md.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentAdvancedSettingsWindow" as const;

export interface OpenAgentAdvancedSettingsWindowOptions {
  agentId: string;
}

export interface AgentAdvancedSettingsWindowHandle {
  close: () => void;
}

export function useOpenAgentAdvancedSettingsWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (opts: OpenAgentAdvancedSettingsWindowOptions): AgentAdvancedSettingsWindowHandle => {
      dispatch(openOverlay({ overlayId: OVERLAY_ID, data: { agentId: opts.agentId } }));
      return {
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
      };
    },
    [dispatch],
  );
}

export function AgentAdvancedSettingsWindowController(
  props: OpenAgentAdvancedSettingsWindowOptions,
): null {
  const open = useOpenAgentAdvancedSettingsWindow();
  useEffect(() => {
    const handle = open({ agentId: props.agentId });
    return () => handle.close();
  }, [open, props.agentId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentAdvancedSettingsWindowDefinitionData = OpenAgentAdvancedSettingsWindowOptions;

export const agentAdvancedSettingsWindowOverlay = /* @__PURE__ */ defineOverlay<AgentAdvancedSettingsWindowDefinitionData>()({
  id: "agentAdvancedSettingsWindow",
  label: "Advanced Settings",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {},
});


declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentAdvancedSettingsWindow: OverlayWire<AgentAdvancedSettingsWindowDefinitionData>;
  }
}
