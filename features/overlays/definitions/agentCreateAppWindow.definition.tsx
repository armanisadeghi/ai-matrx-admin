"use client";

// The `agentCreateAppWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentCreateAppWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentCreateAppWindowDefinitionData } from "./agentCreateAppWindow.overlay";

export const agentCreateAppWindowOverlay = defineOverlay<AgentCreateAppWindowDefinitionData>()({
  id: "agentCreateAppWindow",
  label: "Agent Create App Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "agent-create-app-window",
    mobile: "fullscreen",
  },
});
