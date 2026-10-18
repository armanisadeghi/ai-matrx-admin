"use client";

// The `saveContactFromSelection` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./saveContactFromSelection.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SaveContactFromSelectionDefinitionData } from "./saveContactFromSelection.overlay";

export const saveContactFromSelectionOverlay = defineOverlay<SaveContactFromSelectionDefinitionData>()({
  id: "saveContactFromSelection",
  label: "Save As Contact",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});
