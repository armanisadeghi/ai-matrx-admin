"use client";

// The `researchContextPreviewWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./researchContextPreviewWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ResearchContextPreviewWindowDefinitionData } from "./researchContextPreviewWindow.overlay";

export const researchContextPreviewWindowOverlay = defineOverlay<ResearchContextPreviewWindowDefinitionData>()({
  id: "researchContextPreviewWindow",
  label: "Context Preview",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { topicId: null, bundle: null, title: undefined },
    windowId: "research-context-preview-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});
