"use client";

// The `contentEditorWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./contentEditorWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ContentEditorWindowDefinitionData } from "./contentEditorWindow.overlay";

export const contentEditorWindowOverlay = defineOverlay<ContentEditorWindowDefinitionData>()({
  id: "contentEditorWindow",
  label: "Content Editor Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          documentId: "default",
          documentTitle: null,
          value: "",
          title: null,
        },
    windowId: "content-editor-window",
    mobile: "fullscreen",
  },
});
