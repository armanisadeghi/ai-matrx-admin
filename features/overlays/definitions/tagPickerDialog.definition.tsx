"use client";

// The `tagPickerDialog` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers ask through `pickTag(...)`, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { TagPickerDialogDefinitionData } from "./tagPickerDialog.overlay";

export const tagPickerDialogOverlay = defineOverlay<TagPickerDialogDefinitionData>()({
  id: "tagPickerDialog",
  label: "Tag",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});
