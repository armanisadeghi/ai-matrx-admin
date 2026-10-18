"use client";

// The `addToRulebookDialog` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./addToRulebookDialog.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AddToRulebookDialogDefinitionData } from "./addToRulebookDialog.overlay";

export const addToRulebookDialogOverlay = defineOverlay<AddToRulebookDialogDefinitionData>()({
  id: "addToRulebookDialog",
  label: "Add to Rulebook",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});
