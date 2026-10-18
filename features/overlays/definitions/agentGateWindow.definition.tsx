"use client";

// The `agentGateWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentGateWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentGateWindowDefinitionData } from "./agentGateWindow.overlay";

export const agentGateWindowOverlay = defineOverlay<AgentGateWindowDefinitionData>()({
  id: "agentGateWindow",
  label: "Agent Gate Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { conversationId: null },
    windowId: "agent-gate-window",
    mobile: "fullscreen",
  },
});
