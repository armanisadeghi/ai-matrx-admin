"use client";

// The `convertToShapeWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./convertToShapeWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ConvertToShapeWindowDefinitionData } from "./convertToShapeWindow.overlay";

export const convertToShapeWindowOverlay = defineOverlay<ConvertToShapeWindowDefinitionData>()({
  id: "convertToShapeWindow",
  label: "Convert JSON to Shape",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { initialJsonContent: "" },
    windowId: "convert-to-shape-window",
    mobile: "drawer",
  },
});
