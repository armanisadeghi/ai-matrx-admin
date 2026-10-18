"use client";

// The `saveToCode` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./saveToCode.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SaveToCodeDefinitionData } from "./saveToCode.overlay";

export const saveToCodeOverlay = defineOverlay<SaveToCodeDefinitionData>()({
  id: "saveToCode",
  label: "Save To Code",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
});
