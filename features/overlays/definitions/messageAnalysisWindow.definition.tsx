"use client";

// The `messageAnalysisWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./messageAnalysisWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { MessageAnalysisWindowDefinitionData } from "./messageAnalysisWindow.overlay";

export const messageAnalysisWindowOverlay = defineOverlay<MessageAnalysisWindowDefinitionData>()({
  id: "messageAnalysisWindow",
  label: "Message Analysis Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          conversationId: null,
          requestId: null,
          messageId: null,
          activeTab: "request",
        },
    windowId: "message-analysis-window",
    mobile: "card",
  },
});
