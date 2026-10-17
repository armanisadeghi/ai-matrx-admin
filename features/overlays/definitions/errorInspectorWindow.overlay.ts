"use client";

import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

export type ErrorInspectorWindowDefinitionData = Record<string, unknown>;

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
    ephemeral: true,
  },
  render: () => import("./errorInspectorWindow.render"),
});


declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    errorInspectorWindow: OverlayWire<ErrorInspectorWindowDefinitionData>;
  }
}
