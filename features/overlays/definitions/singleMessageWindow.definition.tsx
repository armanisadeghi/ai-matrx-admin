"use client";

// The `singleMessageWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./singleMessageWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SingleMessageWindowDefinitionData } from "./singleMessageWindow.overlay";

export const singleMessageWindowOverlay = defineOverlay<SingleMessageWindowDefinitionData>()({
  id: "singleMessageWindow",
  label: "Single Message Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { conversationId: null },
    windowId: "single-message-window",
    mobile: "drawer",
    preservation: {
      dataKeys: ["conversationId"],
      requiredDataKeys: ["conversationId"],
    },
  },
});
