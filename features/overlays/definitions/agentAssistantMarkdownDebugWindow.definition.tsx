"use client";

// The `agentAssistantMarkdownDebugWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentAssistantMarkdownDebugWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentAssistantMarkdownDebugWindowDefinitionData } from "./agentAssistantMarkdownDebugWindow.overlay";

export const agentAssistantMarkdownDebugWindowOverlay = defineOverlay<AgentAssistantMarkdownDebugWindowDefinitionData>()({
  id: "agentAssistantMarkdownDebugWindow",
  label: "Agent Assistant Markdown Debug Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "agent-md-debug-window",
    mobile: "card",
    ephemeral: true,
  },
  link: {
    key: "agent-md-debug",
    hydrate: (ctx) => import("./agentAssistantMarkdownDebugWindow.link").then((m) => m.hydrate(ctx)),
  },
});
