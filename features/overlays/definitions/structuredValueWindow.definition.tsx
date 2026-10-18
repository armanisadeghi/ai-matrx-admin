"use client";

// The `structuredValueWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./structuredValueWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { StructuredValueWindowDefinitionData } from "./structuredValueWindow.overlay";

export const structuredValueWindowOverlay = defineOverlay<StructuredValueWindowDefinitionData>()({
  id: "structuredValueWindow",
  label: "Details",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { value: null, title: null, subtitle: null },
    windowId: "structured-value-window",
    mobile: "drawer",
    ephemeral: true,
  },
});
