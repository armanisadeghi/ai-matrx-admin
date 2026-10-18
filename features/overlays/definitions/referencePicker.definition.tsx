"use client";

// The `referencePicker` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./referencePicker.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ReferencePickerDefinitionData } from "./referencePicker.overlay";

export const referencePickerOverlay = defineOverlay<ReferencePickerDefinitionData>()({
  id: "referencePicker",
  label: "Add a Reference",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});
