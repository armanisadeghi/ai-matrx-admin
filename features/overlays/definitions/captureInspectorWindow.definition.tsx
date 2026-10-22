"use client";

// The `captureInspectorWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./captureInspectorWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { CaptureInspectorWindowDefinitionData } from "./captureInspectorWindow.overlay";

export const captureInspectorWindowOverlay = defineOverlay<CaptureInspectorWindowDefinitionData>()({
  id: "captureInspectorWindow",
  label: "Capture Inspector",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { initialExchangeId: null },
    windowId: "capture-inspector",
    mobile: "card",
  },
});
