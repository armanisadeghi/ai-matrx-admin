"use client";

/**
 * Opener for the `contentEditorWindow` overlay.
 *
 * Re-exports the canonical hand-written opener. `useOpenContentEditorWindow`
 * is a single hook that routes to one of three overlays (window / list /
 * workspace) based on the options' `kind` field; each variant gets its own
 * file in this directory for discoverability.
 */
import { useEffect } from "react";
import {
  useOpenContentEditorWindow,
  type OpenContentEditorWindowOptions,
  type ContentEditorWindowHandle,
} from "@/features/window-panels/windows/content-editors/useOpenContentEditorWindow";
import { defineOverlay } from "@ai-matrx/summon/define";
import type { OverlayWire } from "./overlay-types";

export {
  useOpenContentEditorWindow,
  type OpenContentEditorWindowOptions,
  type ContentEditorWindowHandle,
};

export function ContentEditorWindowController(
  props: OpenContentEditorWindowOptions,
): null {
  const open = useOpenContentEditorWindow();
  useEffect(() => {
    const handle = open({ variant: "editor", ...props });
    return () => handle.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type ContentEditorWindowDefinitionData = OpenContentEditorWindowOptions;

export const contentEditorWindowOverlay = /* @__PURE__ */ defineOverlay<ContentEditorWindowDefinitionData>()({
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



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    contentEditorWindow: OverlayWire<ContentEditorWindowDefinitionData>;
  }
}
