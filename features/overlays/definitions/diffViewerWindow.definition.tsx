"use client";

// The `diffViewerWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./diffViewerWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { DiffViewerWindowDefinitionData } from "./diffViewerWindow.overlay";

export const diffViewerWindowOverlay = defineOverlay<DiffViewerWindowDefinitionData>()({
  id: "diffViewerWindow",
  label: "Diff Viewer Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          windowInstanceId: "",
          original: "",
          modified: "",
          originalLabel: "Original",
          modifiedLabel: "Modified",
          title: null as string | null,
          engine: "auto",
          language: null as string | null,
          defaultView: "split",
        },
    windowId: "diff-viewer-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});
