"use client";

// The `flashcardStudyWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./flashcardStudyWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { FlashcardStudyWindowDefinitionData } from "./flashcardStudyWindow.overlay";

export const flashcardStudyWindowOverlay = defineOverlay<FlashcardStudyWindowDefinitionData>()({
  id: "flashcardStudyWindow",
  label: "Flashcard Study Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { setId: null, title: null },
    windowId: "flashcard-study-window",
    mobile: "fullscreen",
    mobileSidebarAs: "drawer",
  },
});
