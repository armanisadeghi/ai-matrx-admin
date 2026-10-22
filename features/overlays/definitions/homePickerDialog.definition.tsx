"use client";

// The `homePickerDialog` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers ask through `pickHome(...)`, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { HomePickerDialogDefinitionData } from "./homePickerDialog.overlay";

export const homePickerDialogOverlay = defineOverlay<HomePickerDialogDefinitionData>()({
  id: "homePickerDialog",
  label: "Move to",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});
