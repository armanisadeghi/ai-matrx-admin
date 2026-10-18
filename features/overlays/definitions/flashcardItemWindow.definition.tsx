"use client";

// The `flashcardItemWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./flashcardItemWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { FlashcardItemWindowDefinitionData } from "./flashcardItemWindow.overlay";

export const flashcardItemWindowOverlay = defineOverlay<FlashcardItemWindowDefinitionData>()({
  id: "flashcardItemWindow",
  label: "Flashcard Item Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: true,
  window: {
    restoreDefaults: {
          front: "",
          back: null,
          index: 0,
          layoutMode: "grid",
          title: null,
          additionalDetails: null,
          lastResult: null,
        },
    windowId: "flashcard-item-window",
    mobile: "fullscreen",
  },
});
