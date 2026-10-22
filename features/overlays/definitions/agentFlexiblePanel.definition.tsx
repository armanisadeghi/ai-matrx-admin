"use client";

// The `agentFlexiblePanel` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentFlexiblePanel.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentFlexiblePanelDefinitionData } from "./agentFlexiblePanel.overlay";

export const agentFlexiblePanelOverlay = defineOverlay<AgentFlexiblePanelDefinitionData>()({
  id: "agentFlexiblePanel",
  label: "Agent Flexible Panel",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "agent-flexible-panel",
  },
});
