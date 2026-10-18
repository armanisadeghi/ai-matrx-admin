"use client";

// The `agentFromChatWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentFromChatWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentFromChatWindowDefinitionData } from "./agentFromChatWindow.overlay";

export const agentFromChatWindowOverlay = defineOverlay<AgentFromChatWindowDefinitionData>()({
  id: "agentFromChatWindow",
  label: "Make an Agent From a Chat",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { conversationId: null, conversationTitle: null },
    windowId: "agent-from-chat-window",
    mobile: "drawer",
    ephemeral: true,
  },
});
