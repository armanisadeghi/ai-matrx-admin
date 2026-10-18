"use client";

// The `extractionCellEditorWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./extractionCellEditorWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { ExtractionCellEditorWindowDefinitionData } from "./extractionCellEditorWindow.overlay";

export const extractionCellEditorWindowOverlay = defineOverlay<ExtractionCellEditorWindowDefinitionData>()({
  id: "extractionCellEditorWindow",
  label: "Extraction Cell Editor Window",
  instance: "multi",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: {
          rowId: null,
          columnKey: null,
          columnLabel: "",
          pageLabel: "",
          value: "",
          readOnly: false,
          writeKey: null,
          currentPayload: {},
          callbackGroupId: null,
        },
    windowId: "extraction-cell-editor-window",
    mobile: "fullscreen",
    ephemeral: true,
  },
});
