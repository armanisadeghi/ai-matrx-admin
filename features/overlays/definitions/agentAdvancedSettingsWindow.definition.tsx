"use client";

// The `agentAdvancedSettingsWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentAdvancedSettingsWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentAdvancedSettingsWindowDefinitionData } from "./agentAdvancedSettingsWindow.overlay";

export const agentAdvancedSettingsWindowOverlay = defineOverlay<AgentAdvancedSettingsWindowDefinitionData>()({
  id: "agentAdvancedSettingsWindow",
  label: "Advanced Settings",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {},
});
