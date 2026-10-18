"use client";

// The `copySubsetWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./copySubsetWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { CopySubsetWindowDefinitionData } from "./copySubsetWindow.overlay";

export const copySubsetWindowOverlay = defineOverlay<CopySubsetWindowDefinitionData>()({
  id: "copySubsetWindow",
  label: "Copy subset",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {},
});
