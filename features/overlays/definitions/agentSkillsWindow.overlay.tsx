"use client";

/**
 * Opener for the `agentSkillsWindow` overlay.
 *
 * `useOpenAgentSkillsWindow()` — imperative hook. Call with an agent id to
 * open the non-blocking skills catalogue window; returns a handle with a
 * `close()` method.
 */

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon/open";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "agentSkillsWindow" as const;

export interface AgentSkillsWindowHandle {
  close: () => void;
}

export function useOpenAgentSkillsWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (agentId: string): AgentSkillsWindowHandle => {
      dispatch(openOverlay({ overlayId: OVERLAY_ID, data: { agentId } }));
      return {
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
      };
    },
    [dispatch],
  );
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type AgentSkillsWindowDefinitionData = Record<string, unknown>;

export const agentSkillsWindowOverlay = /* @__PURE__ */ defineOverlay<AgentSkillsWindowDefinitionData>()({
  id: "agentSkillsWindow",
  label: "Agent Skills",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { agentId: null },
    windowId: "agent-skills-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentSkillsWindow: OverlayWire<AgentSkillsWindowDefinitionData>;
  }
}
