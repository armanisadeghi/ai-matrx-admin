"use client";

// The `quickNoteSaveWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./quickNoteSaveWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { QuickNoteSaveWindowDefinitionData } from "./quickNoteSaveWindow.overlay";

export const quickNoteSaveWindowOverlay = defineOverlay<QuickNoteSaveWindowDefinitionData>()({
  id: "quickNoteSaveWindow",
  label: "Quick Note Save Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { initialContent: "" },
    windowId: "quick-note-save-window",
    mobile: "drawer",
  },
});
