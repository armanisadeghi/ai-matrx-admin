"use client";

// The `meetMatrxWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./meetMatrxWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { MeetMatrxWindowDefinitionData } from "./meetMatrxWindow.overlay";

export const meetMatrxWindowOverlay = defineOverlay<MeetMatrxWindowDefinitionData>()({
  id: "meetMatrxWindow",
  label: "Meet Matrx",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "meet-matrx-window",
    mobile: "fullscreen",
  },
});
