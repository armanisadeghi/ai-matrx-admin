"use client";

// The `errorInspectorWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./errorInspectorWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ErrorInspectorWindowDefinitionData } from "./errorInspectorWindow.overlay";

export const errorInspectorWindowOverlay = defineOverlay<ErrorInspectorWindowDefinitionData>()({
  id: "errorInspectorWindow",
  label: "Error Inspector",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "error-inspector-window",
    mobile: "fullscreen",
  },
});
