"use client";

// The `packageDiffDialog` overlay's registry declaration (chat's diff view, a dialog: no `window` block).
// Read only by overlay-definitions.gen.ts (the lazy summon runtime).
import { defineOverlay } from "@ai-matrx/summon/define";
import type { PackageDiffDialogDefinitionData } from "./packageDiffDialog.overlay";

export const packageDiffDialogOverlay = defineOverlay<PackageDiffDialogDefinitionData>()({
  id: "packageDiffDialog",
  label: "Compare",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});
