"use client";

// The `agentFloatingChat` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentFloatingChat.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentFloatingChatDefinitionData } from "./agentFloatingChat.overlay";

export const agentFloatingChatOverlay = defineOverlay<AgentFloatingChatDefinitionData>()({
  id: "agentFloatingChat",
  label: "Agent Floating Chat",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "agent-floating-chat",
    ephemeral: true,
  },
});
