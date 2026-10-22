"use client";

// The `liveRunWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./liveRunWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { LiveRunWindowDefinitionData } from "./liveRunWindow.overlay";

export const liveRunWindowOverlay = defineOverlay<LiveRunWindowDefinitionData>()({
  id: "liveRunWindow",
  label: "AI Run",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "live-run-window",
    mobile: "card",
  },
});
