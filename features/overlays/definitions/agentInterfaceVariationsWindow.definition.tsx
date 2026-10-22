"use client";

// The `agentInterfaceVariationsWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentInterfaceVariationsWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentInterfaceVariationsWindowDefinitionData } from "./agentInterfaceVariationsWindow.overlay";

export const agentInterfaceVariationsWindowOverlay = defineOverlay<AgentInterfaceVariationsWindowDefinitionData>()({
  id: "agentInterfaceVariationsWindow",
  label: "Agent Interface Variations Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { agentId: null },
    windowId: "agent-interface-variations-window",
    mobile: "fullscreen",
    deprecated: { reason: "Stub — not yet implemented. Will be removed if no implementation lands." },
  },
});
