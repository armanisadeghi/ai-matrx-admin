"use client";

// The `flashcardSubcardsWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./flashcardSubcardsWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { FlashcardSubcardsWindowDefinitionData } from "./flashcardSubcardsWindow.overlay";

export const flashcardSubcardsWindowOverlay = defineOverlay<FlashcardSubcardsWindowDefinitionData>()({
  id: "flashcardSubcardsWindow",
  label: "Flashcard Subcards Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { subcards: [], title: null, parentFront: null },
    windowId: "flashcard-subcards-window",
    mobile: "fullscreen",
  },
});
