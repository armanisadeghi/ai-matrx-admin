"use client";

// The `agentChatAssistant` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentChatAssistant.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentChatAssistantDefinitionData } from "./agentChatAssistant.overlay";

export const agentChatAssistantOverlay = defineOverlay<AgentChatAssistantDefinitionData>()({
  id: "agentChatAssistant",
  label: "Agent Chat Assistant",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});
