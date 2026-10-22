"use client";

// The `agentAdminShortcutWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentAdminShortcutWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentAdminShortcutWindowDefinitionData } from "./agentAdminShortcutWindow.overlay";

export const agentAdminShortcutWindowOverlay = defineOverlay<AgentAdminShortcutWindowDefinitionData>()({
  id: "agentAdminShortcutWindow",
  label: "Agent Admin Shortcut Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { agentId: null, activeTab: "essentials" },
    windowId: "agent-admin-shortcut-window",
    mobile: "drawer",
  },
});
