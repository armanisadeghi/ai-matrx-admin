"use client";

// The `listenSummaryWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./listenSummaryWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ListenSummaryWindowDefinitionData } from "./listenSummaryWindow.overlay";

export const listenSummaryWindowOverlay = defineOverlay<ListenSummaryWindowDefinitionData>()({
  id: "listenSummaryWindow",
  label: "Listen",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {},
    windowId: "listen-summary-window",
    mobile: "card",
  },
});
