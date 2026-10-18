"use client";

// The `characterCounterWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./characterCounterWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { CharacterCounterWindowDefinitionData } from "./characterCounterWindow.overlay";

export const characterCounterWindowOverlay = defineOverlay<CharacterCounterWindowDefinitionData>()({
  id: "characterCounterWindow",
  label: "Character Counter",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { initialText: "" },
    windowId: "character-counter-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});
