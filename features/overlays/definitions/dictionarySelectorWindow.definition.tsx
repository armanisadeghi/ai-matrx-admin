"use client";

// The `dictionarySelectorWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./dictionarySelectorWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { DictionarySelectorWindowDefinitionData } from "./dictionarySelectorWindow.overlay";

export const dictionarySelectorWindowOverlay = defineOverlay<DictionarySelectorWindowDefinitionData>()({
  id: "dictionarySelectorWindow",
  label: "Dictionary Context",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { surfaceKey: "_default" },
    windowId: "dictionary-selector",
    mobile: "drawer",
  },
});
