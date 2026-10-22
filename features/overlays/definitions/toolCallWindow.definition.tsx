"use client";

// The `toolCallWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./toolCallWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ToolCallWindowDefinitionData } from "./toolCallWindow.overlay";

export const toolCallWindowOverlay = defineOverlay<ToolCallWindowDefinitionData>()({
  id: "toolCallWindow",
  label: "Tool Call Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          requestId: null,
          callIds: [],
          entries: null,
          initialCallId: null,
          initialTab: null,
          conversationId: null,
          readOnly: false,
        },
    windowId: "tool-call-window",
    mobile: "fullscreen",
    mobileSidebarAs: "drawer",
  },
});
