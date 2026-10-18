"use client";

// The `agentOptimizerWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentOptimizerWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentOptimizerWindowDefinitionData } from "./agentOptimizerWindow.overlay";

export const agentOptimizerWindowOverlay = defineOverlay<AgentOptimizerWindowDefinitionData>()({
  id: "agentOptimizerWindow",
  label: "Agent Optimizer Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { agentId: null },
    windowId: "agent-optimizer-window",
    mobile: "fullscreen",
    ephemeral: true,
    deprecated: { reason: "Stub — not yet implemented. Will be removed if no implementation lands." },
  },
});
