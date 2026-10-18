"use client";

// The `setContextValueWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./setContextValueWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SetContextValueWindowDefinitionData } from "./setContextValueWindow.overlay";

export const setContextValueWindowOverlay = defineOverlay<SetContextValueWindowDefinitionData>()({
  id: "setContextValueWindow",
  label: "Set Context Value Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {},
});
