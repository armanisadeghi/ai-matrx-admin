"use client";

// The `streamDebugHistoryWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./streamDebugHistoryWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { StreamDebugHistoryWindowDefinitionData } from "./streamDebugHistoryWindow.overlay";

export const streamDebugHistoryWindowOverlay = defineOverlay<StreamDebugHistoryWindowDefinitionData>()({
  id: "streamDebugHistoryWindow",
  label: "Stream Debug History Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { initialConversationId: null },
    windowId: "stream-debug-history",
    mobile: "card",
  },
});
