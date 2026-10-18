"use client";

// The `scopeBatchImportWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./scopeBatchImportWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ScopeBatchImportWindowDefinitionData } from "./scopeBatchImportWindow.overlay";

export const scopeBatchImportWindowOverlay = defineOverlay<ScopeBatchImportWindowDefinitionData>()({
  id: "scopeBatchImportWindow",
  label: "Batch Add from Scope Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {},
});
