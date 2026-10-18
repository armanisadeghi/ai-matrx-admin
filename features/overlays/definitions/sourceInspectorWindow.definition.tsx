"use client";

// The `sourceInspectorWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./sourceInspectorWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { SourceInspectorWindowDefinitionData } from "./sourceInspectorWindow.overlay";

export const sourceInspectorWindowOverlay = defineOverlay<SourceInspectorWindowDefinitionData>()({
  id: "sourceInspectorWindow",
  label: "Source Inspector",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          sourceKind: null,
          sourceId: null,
          chunkId: null,
          pageNumber: null,
          pageNumbers: null,
          snippet: null,
          fileName: null,
          score: null,
          query: null,
          href: null,
        },
    windowId: "source-inspector-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});
