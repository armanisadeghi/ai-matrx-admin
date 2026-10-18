"use client";

// The `agentDebugWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentDebugWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentDebugWindowDefinitionData } from "./agentDebugWindow.overlay";

export const agentDebugWindowOverlay = defineOverlay<AgentDebugWindowDefinitionData>()({
  id: "agentDebugWindow",
  label: "Agent Debug Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { initialAgentId: null, initialConversationId: null },
    windowId: "agent-debug-window",
    mobile: "card",
    ephemeral: true,
  },
});
