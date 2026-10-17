"use client";

/**
 * Opener for the `multiFileSmartCodeEditorWindow` overlay.
 *
 * Re-exports the canonical hand-written opener (full callback-aware API).
 */
import { useEffect } from "react";
import {
  useOpenMultiFileSmartCodeEditorWindow,
  type OpenMultiFileSmartCodeEditorWindowOptions,
  type MultiFileSmartCodeEditorWindowHandle,
} from "@/features/window-panels/windows/multi-file-smart-code-editor/useOpenMultiFileSmartCodeEditorWindow";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

export {
  useOpenMultiFileSmartCodeEditorWindow,
  type OpenMultiFileSmartCodeEditorWindowOptions,
  type MultiFileSmartCodeEditorWindowHandle,
};

export function MultiFileSmartCodeEditorWindowController(
  props: OpenMultiFileSmartCodeEditorWindowOptions,
): null {
  const open = useOpenMultiFileSmartCodeEditorWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, props.windowInstanceId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type MultiFileSmartCodeEditorWindowDefinitionData = OpenMultiFileSmartCodeEditorWindowOptions;

export const multiFileSmartCodeEditorWindowOverlay = defineOverlay<MultiFileSmartCodeEditorWindowDefinitionData>()({
  id: "multiFileSmartCodeEditorWindow",
  label: "Multi File Smart Code Editor Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          agentId: null,
          files: [],
          initialActiveFile: null,
          title: null,
          defaultWordWrap: "off",
          autoFormatOnOpen: false,
          variables: null,
        },
    windowId: "multi-file-smart-code-editor-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
  render: () => import("./multiFileSmartCodeEditorWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    multiFileSmartCodeEditorWindow: OverlayWire<MultiFileSmartCodeEditorWindowDefinitionData>;
  }
}
