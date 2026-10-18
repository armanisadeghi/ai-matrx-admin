"use client";

// The `agentRunWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentRunWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentRunWindowDefinitionData } from "./agentRunWindow.overlay";

export const agentRunWindowOverlay = defineOverlay<AgentRunWindowDefinitionData>()({
  id: "agentRunWindow",
  label: "Chat Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          initialAgentId: null,
          initialSelectedConversationId: null,
        },
    windowId: "agent-run-window",
    mobile: "fullscreen",
    mobileSidebarAs: "drawer",
  },
  link: {
    key: "agent",
    hydrate: (ctx) => import("./agentRunWindow.link").then((m) => m.hydrate(ctx)),
  },
});
