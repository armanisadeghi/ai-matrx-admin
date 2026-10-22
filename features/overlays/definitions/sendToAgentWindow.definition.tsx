"use client";

// The `sendToAgentWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./sendToAgentWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SendToAgentWindowDefinitionData } from "./sendToAgentWindow.overlay";

export const sendToAgentWindowOverlay = defineOverlay<SendToAgentWindowDefinitionData>()({
  id: "sendToAgentWindow",
  label: "Send to another agent",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          initialContent: null as string | null,
          initialSourceTitle: null as string | null,
        },
    windowId: "send-to-agent-window",
    mobile: "drawer",
  },
});
