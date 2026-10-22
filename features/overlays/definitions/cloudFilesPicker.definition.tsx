"use client";

// The `cloudFilesPicker` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers ask through its opener function, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { CloudFilesPickerDefinitionData } from "./cloudFilesPicker.overlay";

export const cloudFilesPickerOverlay = defineOverlay<CloudFilesPickerDefinitionData>()({
  id: "cloudFilesPicker",
  label: "Choose from your files",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
});
