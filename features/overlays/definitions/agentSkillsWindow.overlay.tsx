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

export type AgentSkillsWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentSkillsWindow: OverlayWire<AgentSkillsWindowDefinitionData>;
  }
}
