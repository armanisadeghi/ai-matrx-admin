"use client";

// The `uploadGuardDialog` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers ask through its opener function, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { UploadGuardDialogDefinitionData } from "./uploadGuardDialog.overlay";

export const uploadGuardDialogOverlay = defineOverlay<UploadGuardDialogDefinitionData>()({
  id: "uploadGuardDialog",
  label: "Duplicate files",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});
