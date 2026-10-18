"use client";

// The `agentConnectionsWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentConnectionsWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentConnectionsWindowDefinitionData } from "./agentConnectionsWindow.overlay";

export const agentConnectionsWindowOverlay = defineOverlay<AgentConnectionsWindowDefinitionData>()({
  id: "agentConnectionsWindow",
  label: "Agent Connections Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          activeSection: "overview",
          scope: "user",
          scopeId: null,
          selectedItemId: null,
        },
    windowId: "agent-connections-window",
    mobile: "drawer",
    mobileSidebarAs: "drawer",
  },
});
