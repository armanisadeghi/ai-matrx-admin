"use client";

// The `agentChatCollapsible` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentChatCollapsible.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentChatCollapsibleDefinitionData } from "./agentChatCollapsible.overlay";

export const agentChatCollapsibleOverlay = defineOverlay<AgentChatCollapsibleDefinitionData>()({
  id: "agentChatCollapsible",
  label: "Agent Chat Collapsible",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});
