"use client";

// The `packageDiffDialog` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers ask through chat's opener, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { PackageDiffDialogDefinitionData } from "./packageDiffDialog.overlay";

export const packageDiffDialogOverlay = defineOverlay<PackageDiffDialogDefinitionData>()({
  id: "packageDiffDialog",
  label: "Compare",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});
