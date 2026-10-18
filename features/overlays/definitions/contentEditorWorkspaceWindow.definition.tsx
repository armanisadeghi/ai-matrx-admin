"use client";

// The `contentEditorWorkspaceWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./contentEditorWorkspaceWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ContentEditorWorkspaceWindowDefinitionData } from "./contentEditorWorkspaceWindow.overlay";

export const contentEditorWorkspaceWindowOverlay = defineOverlay<ContentEditorWorkspaceWindowDefinitionData>()({
  id: "contentEditorWorkspaceWindow",
  label: "Content Editor Workspace Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          documents: [],
          openDocumentIds: [],
          activeDocumentId: null,
          listTitle: null,
          title: null,
        },
    windowId: "content-editor-workspace-window",
    mobile: "drawer",
    mobileSidebarAs: "drawer",
  },
});
