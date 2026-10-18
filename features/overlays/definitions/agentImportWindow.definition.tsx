"use client";

// The `agentImportWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentImportWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentImportWindowDefinitionData } from "./agentImportWindow.overlay";

export const agentImportWindowOverlay = defineOverlay<AgentImportWindowDefinitionData>()({
  id: "agentImportWindow",
  label: "Agent Import Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { selectedSource: "agent-json", pastedText: "" },
    windowId: "agent-import-window",
    mobile: "drawer",
  },
});
