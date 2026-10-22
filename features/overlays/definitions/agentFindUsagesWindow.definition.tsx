"use client";

// The `agentFindUsagesWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentFindUsagesWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentFindUsagesWindowDefinitionData } from "./agentFindUsagesWindow.overlay";

export const agentFindUsagesWindowOverlay = defineOverlay<AgentFindUsagesWindowDefinitionData>()({
  id: "agentFindUsagesWindow",
  label: "Agent Find Usages Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { agentId: null },
    windowId: "agent-find-usages-window",
    mobile: "fullscreen",
  },
});
