"use client";

// The `agentMemoryWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentMemoryWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentMemoryWindowDefinitionData } from "./agentMemoryWindow.overlay";

export const agentMemoryWindowOverlay = defineOverlay<AgentMemoryWindowDefinitionData>()({
  id: "agentMemoryWindow",
  label: "Agent Memory",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "agent-memory-window",
    mobile: "drawer",
  },
});
