"use client";

/**
 * Opener for the `pdfBatchExtractDebugWindow` overlay.
 */

import type { OverlayWire } from "./overlay-types";
import { appOpener } from "./app-opener";

const OVERLAY_ID = "pdfBatchExtractDebugWindow" as const;

export interface OpenPdfBatchExtractDebugWindowOptions {
  initialSessionId?: string | null;
}

export interface PdfBatchExtractDebugWindowHandle {
  close: () => void;
}

const opener = appOpener<OpenPdfBatchExtractDebugWindowOptions>(OVERLAY_ID, {
  data: (opts: OpenPdfBatchExtractDebugWindowOptions = {}) => ({
            initialSessionId: opts.initialSessionId ?? null,
          }),
});

export const useOpenPdfBatchExtractDebugWindow = opener.useOpen;

export const PdfBatchExtractDebugWindowController = opener.Controller;

export type PdfBatchExtractDebugWindowDefinitionData = OpenPdfBatchExtractDebugWindowOptions;

declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    pdfBatchExtractDebugWindow: OverlayWire<PdfBatchExtractDebugWindowDefinitionData>;
  }
}
