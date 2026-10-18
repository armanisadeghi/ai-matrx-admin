"use client";

// The `contentEditorListWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./contentEditorListWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ContentEditorListWindowDefinitionData } from "./contentEditorListWindow.overlay";

export const contentEditorListWindowOverlay = defineOverlay<ContentEditorListWindowDefinitionData>()({
  id: "contentEditorListWindow",
  label: "Content Editor List Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          documents: [],
          activeDocumentId: null,
          listTitle: null,
          title: null,
        },
    windowId: "content-editor-list-window",
    mobile: "drawer",
    mobileSidebarAs: "drawer",
  },
});
