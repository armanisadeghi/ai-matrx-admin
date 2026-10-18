"use client";

// The `agentAdminFindUsagesWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentAdminFindUsagesWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentAdminFindUsagesWindowDefinitionData } from "./agentAdminFindUsagesWindow.overlay";

export const agentAdminFindUsagesWindowOverlay = defineOverlay<AgentAdminFindUsagesWindowDefinitionData>()({
  id: "agentAdminFindUsagesWindow",
  label: "Agent Admin Find Usages Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { agentId: null },
    windowId: "agent-admin-find-usages-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});
