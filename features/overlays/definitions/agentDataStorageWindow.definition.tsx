"use client";

// The `agentDataStorageWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentDataStorageWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentDataStorageWindowDefinitionData } from "./agentDataStorageWindow.overlay";

export const agentDataStorageWindowOverlay = defineOverlay<AgentDataStorageWindowDefinitionData>()({
  id: "agentDataStorageWindow",
  label: "Agent Data Storage Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { agentId: null },
    windowId: "agent-data-storage-window",
    mobile: "fullscreen",
    ephemeral: true,
    deprecated: { reason: "Stub — not yet implemented. Will be removed if no implementation lands." },
  },
});
