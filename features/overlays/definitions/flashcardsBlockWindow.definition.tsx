"use client";

// The `flashcardsBlockWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./flashcardsBlockWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { FlashcardsBlockWindowDefinitionData } from "./flashcardsBlockWindow.overlay";

export const flashcardsBlockWindowOverlay = defineOverlay<FlashcardsBlockWindowDefinitionData>()({
  id: "flashcardsBlockWindow",
  label: "Flashcards Block Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          content: null,
          serverData: null,
          title: null,
          additionalDetails: null,
          taskId: null,
          artifactId: null,
          messageId: null,
          conversationId: null,
          blockIndex: null,
        },
    windowId: "flashcards-block-window",
    mobile: "fullscreen",
  },
});
