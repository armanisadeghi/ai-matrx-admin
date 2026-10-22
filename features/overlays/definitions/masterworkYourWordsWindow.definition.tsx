"use client";

// The `masterworkYourWordsWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./masterworkYourWordsWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { MasterworkYourWordsWindowDefinitionData } from "./masterworkYourWordsWindow.overlay";

export const masterworkYourWordsWindowOverlay = defineOverlay<MasterworkYourWordsWindowDefinitionData>()({
  id: "masterworkYourWordsWindow",
  label: "Your words",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { rulebookId: null },
    windowId: "masterwork-your-words-window",
    mobile: "fullscreen",
  },
});
