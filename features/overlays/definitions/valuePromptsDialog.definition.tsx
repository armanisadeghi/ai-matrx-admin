"use client";

// The `valuePromptsDialog` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers ask through chat's opener, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ValuePromptsDialogDefinitionData } from "./valuePromptsDialog.overlay";

export const valuePromptsDialogOverlay = defineOverlay<ValuePromptsDialogDefinitionData>()({
  id: "valuePromptsDialog",
  label: "Values needed",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});
