"use client";

// The `waitingRunsWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./waitingRunsWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { WaitingRunsWindowDefinitionData } from "./waitingRunsWindow.overlay";

export const waitingRunsWindowOverlay = defineOverlay<WaitingRunsWindowDefinitionData>()({
  id: "waitingRunsWindow",
  label: "Workflows waiting on you",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "waiting-runs-window",
    mobile: "fullscreen",
  },
});
