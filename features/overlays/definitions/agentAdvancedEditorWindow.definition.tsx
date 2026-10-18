"use client";

// The `agentAdvancedEditorWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentAdvancedEditorWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentAdvancedEditorWindowDefinitionData } from "./agentAdvancedEditorWindow.overlay";

export const agentAdvancedEditorWindowOverlay = defineOverlay<AgentAdvancedEditorWindowDefinitionData>()({
  id: "agentAdvancedEditorWindow",
  label: "Agent Advanced Editor Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { initialAgentId: null, initialTab: "messages", tabs: null },
    windowId: "agent-advanced-editor-window",
    mobile: "drawer",
    mobileSidebarAs: "drawer",
  },
  link: {
    key: "agent-content",
    hydrate: (ctx) => import("./agentAdvancedEditorWindow.link").then((m) => m.hydrate(ctx)),
  },
});
