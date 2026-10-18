"use client";

// The `agentRunHistoryWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentRunHistoryWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentRunHistoryWindowDefinitionData } from "./agentRunHistoryWindow.overlay";

export const agentRunHistoryWindowOverlay = defineOverlay<AgentRunHistoryWindowDefinitionData>()({
  id: "agentRunHistoryWindow",
  label: "Agent Run History Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { agentId: null, initialSelectedConversationId: null },
    windowId: "agent-run-history-window",
    mobile: "fullscreen",
  },
});
