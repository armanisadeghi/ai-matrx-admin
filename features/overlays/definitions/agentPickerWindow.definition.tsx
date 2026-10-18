"use client";

// The `agentPickerWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./agentPickerWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AgentPickerWindowDefinitionData } from "./agentPickerWindow.overlay";

export const agentPickerWindowOverlay = defineOverlay<AgentPickerWindowDefinitionData>()({
  id: "agentPickerWindow",
  label: "Select Agent",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          callbackGroupId: null as string | null,
          title: null as string | null,
          activeAgentId: null as string | null,
        },
    windowId: "agent-picker-window",
    mobile: "drawer",
    ephemeral: true,
  },
});
