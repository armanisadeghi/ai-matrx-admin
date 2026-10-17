"use client";

/**
 * Opener for the `contentEditorListWindow` overlay.
 *
 * Routes through the shared `useOpenContentEditorWindow` hook. See
 * `contentEditorWindow.tsx` for the canonical hook.
 */
import { useEffect } from "react";
import {
  useOpenContentEditorWindow,
  type OpenContentEditorListWindowOptions,
  type ContentEditorWindowHandle,
} from "@/features/window-panels/windows/content-editors/useOpenContentEditorWindow";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

export {
  useOpenContentEditorWindow,
  type OpenContentEditorListWindowOptions,
  type ContentEditorWindowHandle,
};

export function ContentEditorListWindowController(
  props: OpenContentEditorListWindowOptions,
): null {
  const open = useOpenContentEditorWindow();
  useEffect(() => {
    const handle = open({ variant: "list", ...props });
    return () => handle.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type ContentEditorListWindowDefinitionData = OpenContentEditorListWindowOptions;

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



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    contentEditorListWindow: OverlayWire<ContentEditorListWindowDefinitionData>;
  }
}
