"use client";

// The `masterworkCheckupWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./masterworkCheckupWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { MasterworkCheckupWindowDefinitionData } from "./masterworkCheckupWindow.overlay";

export const masterworkCheckupWindowOverlay = defineOverlay<MasterworkCheckupWindowDefinitionData>()({
  id: "masterworkCheckupWindow",
  label: "Final Checkup",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { rulebookId: null },
    windowId: "masterwork-checkup-window",
    mobile: "fullscreen",
  },
});
