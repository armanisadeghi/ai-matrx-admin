"use client";

/**
 * Opener for the `agentAdvancedSettingsWindow` overlay.
 *
 * - `useOpenAgentAdvancedSettingsWindow()` — imperative hook; opens with the agent id.
 * - `<AgentAdvancedSettingsWindowController />` — declarative wrapper.
 *
 * Declared through appOpener (summon createOpener) — see features/overlays/FEATURE.md.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "agentAdvancedSettingsWindow" as const;

export interface OpenAgentAdvancedSettingsWindowOptions {
  agentId: string;
}

export interface AgentAdvancedSettingsWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenAgentAdvancedSettingsWindowOptions>(OVERLAY_ID);

export const useOpenAgentAdvancedSettingsWindow = opener.useOpen;

export const AgentAdvancedSettingsWindowController = opener.Controller;

export type AgentAdvancedSettingsWindowDefinitionData = OpenAgentAdvancedSettingsWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    agentAdvancedSettingsWindow: OverlayWire<AgentAdvancedSettingsWindowDefinitionData>;
  }
}
