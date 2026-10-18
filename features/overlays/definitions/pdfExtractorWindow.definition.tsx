"use client";

// The `pdfExtractorWindow` overlay's registry declaration. Read only by overlay-definitions.gen.ts (the lazy
// summon runtime); callers open it through ./pdfExtractorWindow.overlay, which never loads this file.
import { defineOverlay } from "@ai-matrx/summon/define";
import type { PdfExtractorWindowDefinitionData } from "./pdfExtractorWindow.overlay";

export const pdfExtractorWindowOverlay = defineOverlay<PdfExtractorWindowDefinitionData>()({
  id: "pdfExtractorWindow",
  label: "Pdf Extractor Window",
  instance: "single",
  keepAlive: "none",
  closesOnNavigation: false,
  window: {
    restoreDefaults: { history: [], currentIndex: null },
    windowId: "pdf-extractor-window",
    mobile: "fullscreen",
    mobileSidebarAs: "drawer",
  },
});
