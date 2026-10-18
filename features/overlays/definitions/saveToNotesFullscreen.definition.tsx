"use client";

// The `saveToNotesFullscreen` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./saveToNotesFullscreen.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SaveToNotesFullscreenDefinitionData } from "./saveToNotesFullscreen.overlay";

export const saveToNotesFullscreenOverlay = defineOverlay<SaveToNotesFullscreenDefinitionData>()({
  id: "saveToNotesFullscreen",
  label: "Save To Notes Fullscreen",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});
