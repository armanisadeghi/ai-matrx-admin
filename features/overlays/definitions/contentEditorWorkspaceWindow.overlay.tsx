"use client";

/**
 * Opener for the `contentEditorWorkspaceWindow` overlay.
 *
 * Routes through the shared `useOpenContentEditorWindow` hook. See
 * `contentEditorWindow.tsx` for the canonical hook.
 */
import { useEffect } from "react";
import {
  useOpenContentEditorWindow,
  type OpenContentEditorWorkspaceWindowOptions,
  type ContentEditorWindowHandle,
} from "@/features/window-panels/windows/content-editors/useOpenContentEditorWindow";
import { defineOverlay } from "@ai-matrx/summon/root";
import type { OverlayWire } from "./overlay-types";

export {
  useOpenContentEditorWindow,
  type OpenContentEditorWorkspaceWindowOptions,
  type ContentEditorWindowHandle,
};

export function ContentEditorWorkspaceWindowController(
  props: OpenContentEditorWorkspaceWindowOptions,
): null {
  const open = useOpenContentEditorWindow();
  useEffect(() => {
    const handle = open({ variant: "workspace", ...props });
    return () => handle.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type ContentEditorWorkspaceWindowDefinitionData = OpenContentEditorWorkspaceWindowOptions;

export const contentEditorWorkspaceWindowOverlay = /* @__PURE__ */ defineOverlay<ContentEditorWorkspaceWindowDefinitionData>()({
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



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    contentEditorWorkspaceWindow: OverlayWire<ContentEditorWorkspaceWindowDefinitionData>;
  }
}
