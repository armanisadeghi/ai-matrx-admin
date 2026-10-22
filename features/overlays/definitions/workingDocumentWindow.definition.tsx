"use client";

// The `workingDocumentWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./workingDocumentWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { WorkingDocumentWindowDefinitionData } from "./workingDocumentWindow.overlay";

export const workingDocumentWindowOverlay = defineOverlay<WorkingDocumentWindowDefinitionData>()({
  id: "workingDocumentWindow",
  label: "Working Document Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { conversationId: null },
    windowId: "working-document-window",
    mobile: "fullscreen",
  },
});
