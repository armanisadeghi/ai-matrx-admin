"use client";

// The `cantRemoveDialog` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers ask through its opener function, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { CantRemoveDialogDefinitionData } from "./cantRemoveDialog.overlay";

export const cantRemoveDialogOverlay = defineOverlay<CantRemoveDialogDefinitionData>()({
  id: "cantRemoveDialog",
  label: "Can't remove",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});
