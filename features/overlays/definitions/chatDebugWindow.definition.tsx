"use client";

// The `chatDebugWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./chatDebugWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ChatDebugWindowDefinitionData } from "./chatDebugWindow.overlay";

export const chatDebugWindowOverlay = defineOverlay<ChatDebugWindowDefinitionData>()({
  id: "chatDebugWindow",
  label: "Chat Debug Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { sessionId: null },
    windowId: "chat-debug-window",
    mobile: "card",
    ephemeral: true,
  },
});
