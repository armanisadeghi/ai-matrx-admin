"use client";

// The `customAgentWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./customAgentWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { CustomAgentWindowDefinitionData } from "./customAgentWindow.overlay";

export const customAgentWindowOverlay = defineOverlay<CustomAgentWindowDefinitionData>()({
  id: "customAgentWindow",
  label: "Custom agent",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { sessionId: null as string | null },
    windowId: "custom-agent-window",
    mobile: "drawer",
  },
});
