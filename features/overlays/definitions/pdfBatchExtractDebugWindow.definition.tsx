"use client";

// The `pdfBatchExtractDebugWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./pdfBatchExtractDebugWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { PdfBatchExtractDebugWindowDefinitionData } from "./pdfBatchExtractDebugWindow.overlay";

export const pdfBatchExtractDebugWindowOverlay = defineOverlay<PdfBatchExtractDebugWindowDefinitionData>()({
  id: "pdfBatchExtractDebugWindow",
  label: "PDF Batch Extract Debug Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { selectedSessionId: null },
    windowId: "pdf-batch-extract-debug",
    mobile: "card",
    ephemeral: true,
  },
});
