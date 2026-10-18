"use client";

// The `runControlsWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./runControlsWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { RunControlsWindowDefinitionData } from "./runControlsWindow.overlay";

export const runControlsWindowOverlay = defineOverlay<RunControlsWindowDefinitionData>()({
  id: "runControlsWindow",
  label: "Chat Options Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { conversationId: null },
    windowId: "run-controls-window",
    mobile: "drawer",
    ephemeral: true,
  },
});
