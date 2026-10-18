"use client";

// The `saveTemplateDialog` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./saveTemplateDialog.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SaveTemplateDialogDefinitionData } from "./saveTemplateDialog.overlay";

export const saveTemplateDialogOverlay = defineOverlay<SaveTemplateDialogDefinitionData>()({
  id: "saveTemplateDialog",
  label: "Save as Template",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});
