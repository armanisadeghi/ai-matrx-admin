"use client";

// The `agentChatBubble` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentChatBubble.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentChatBubbleDefinitionData } from "./agentChatBubble.overlay";

export const agentChatBubbleOverlay = defineOverlay<AgentChatBubbleDefinitionData>()({
  id: "agentChatBubble",
  label: "Agent Chat Bubble",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});
