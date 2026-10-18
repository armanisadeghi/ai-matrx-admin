"use client";

// The `agentConvertSystemWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentConvertSystemWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentConvertSystemWindowDefinitionData } from "./agentConvertSystemWindow.overlay";

export const agentConvertSystemWindowOverlay = defineOverlay<AgentConvertSystemWindowDefinitionData>()({
  id: "agentConvertSystemWindow",
  label: "Agent Convert System Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { agentId: null },
    windowId: "agent-convert-system-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});
