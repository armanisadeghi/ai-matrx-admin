"use client";

// The `attachResourcePicker` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./attachResourcePicker.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AttachResourcePickerDefinitionData } from "./attachResourcePicker.overlay";

export const attachResourcePickerOverlay = defineOverlay<AttachResourcePickerDefinitionData>()({
  id: "attachResourcePicker",
  label: "Choose what to attach",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});
