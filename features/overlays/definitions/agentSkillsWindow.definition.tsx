"use client";

// The `agentSkillsWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentSkillsWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentSkillsWindowDefinitionData } from "./agentSkillsWindow.overlay";

export const agentSkillsWindowOverlay = defineOverlay<AgentSkillsWindowDefinitionData>()({
  id: "agentSkillsWindow",
  label: "Agent Skills",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { agentId: null },
    windowId: "agent-skills-window",
    mobile: "fullscreen",
  },
});
