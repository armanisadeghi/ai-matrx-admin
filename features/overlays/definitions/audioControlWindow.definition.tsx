"use client";

// The `audioControlWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./audioControlWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { AudioControlWindowDefinitionData } from "./audioControlWindow.overlay";

export const audioControlWindowOverlay = defineOverlay<AudioControlWindowDefinitionData>()({
  id: "audioControlWindow",
  label: "Media",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "audio-control-window",
    mobile: "card",
    ephemeral: true,
  },
});
