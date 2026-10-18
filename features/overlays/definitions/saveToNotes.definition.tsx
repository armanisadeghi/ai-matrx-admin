"use client";

// The `saveToNotes` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./saveToNotes.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SaveToNotesDefinitionData } from "./saveToNotes.overlay";

export const saveToNotesOverlay = defineOverlay<SaveToNotesDefinitionData>()({
  id: "saveToNotes",
  label: "Save To Notes",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});
