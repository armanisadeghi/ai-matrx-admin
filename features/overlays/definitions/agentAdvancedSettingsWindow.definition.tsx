"use client";

// The `agentAdvancedSettingsWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentAdvancedSettingsWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentAdvancedSettingsWindowDefinitionData } from "./agentAdvancedSettingsWindow.overlay";

// It edits the agent OPEN IN THE BUILDER (the builder's draft record), so it is a piece of the
// page that opened it: it closes when the route changes and is never restored by the saved
// workspace. Remembered by default, it reopened on unrelated pages after every reload and sat
// over the builder header, writing into a record no page had loaded (2026-10-21).
export const agentAdvancedSettingsWindowOverlay = defineOverlay<AgentAdvancedSettingsWindowDefinitionData>()({
  id: "agentAdvancedSettingsWindow",
  label: "Advanced Settings",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: true,
  window: {
    windowId: "agent-advanced-settings-window",
  },
});
