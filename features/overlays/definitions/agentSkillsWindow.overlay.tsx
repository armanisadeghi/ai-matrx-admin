"use client";

/**
 * Opener for the `agentSkillsWindow` overlay.
 *
 * `useOpenAgentSkillsWindow()` — imperative hook. Call with an agent id to
 * open the non-blocking skills catalog window; returns a handle with a
 * `close()` method.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentSkillsWindow" as const;

export interface AgentSkillsWindowHandle {
  close: () => void;
}

const opener = appOpener<string>(OVERLAY_ID, {
  instanceId: () => undefined,
  data: (agentId: string) => ({ agentId }),
});

export const useOpenAgentSkillsWindow = opener.useOpen;

export type AgentSkillsWindowDefinitionData = Record<string, unknown>;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentSkillsWindow: OverlayWire<AgentSkillsWindowDefinitionData>;
  }
}
