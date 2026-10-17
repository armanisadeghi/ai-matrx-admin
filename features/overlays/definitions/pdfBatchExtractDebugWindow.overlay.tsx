"use client";

/**
 * Opener for the `pdfBatchExtractDebugWindow` overlay.
 */

import { useCallback, useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { closeOverlay, openOverlay } from "@ai-matrx/summon";
import { defineOverlay } from "@ai-matrx/summon/react";
import type { OverlayWire } from "./overlay-types";

const OVERLAY_ID = "pdfBatchExtractDebugWindow" as const;

export interface OpenPdfBatchExtractDebugWindowOptions {
  initialSessionId?: string | null;
}

export interface PdfBatchExtractDebugWindowHandle {
  close: () => void;
}

export function useOpenPdfBatchExtractDebugWindow() {
  const dispatch = useAppDispatch();
  return useCallback(
    (
      opts: OpenPdfBatchExtractDebugWindowOptions = {},
    ): PdfBatchExtractDebugWindowHandle => {
      dispatch(
        openOverlay({
          overlayId: OVERLAY_ID,
          data: {
            initialSessionId: opts.initialSessionId ?? null,
          },
        }),
      );
      return {
        close: () => dispatch(closeOverlay({ overlayId: OVERLAY_ID })),
      };
    },
    [dispatch],
  );
}

export function PdfBatchExtractDebugWindowController(
  props: OpenPdfBatchExtractDebugWindowOptions,
): null {
  const open = useOpenPdfBatchExtractDebugWindow();
  useEffect(() => {
    const handle = open(props);
    return () => handle.close();
  }, [open, props.initialSessionId]);
  return null;
}

// ── definition (@ai-matrx/summon) ──────────────────────────────────────────────────

export type PdfBatchExtractDebugWindowDefinitionData = OpenPdfBatchExtractDebugWindowOptions;

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
  render: () => import("./pdfBatchExtractDebugWindow.render"),
});



declare module "@ai-matrx/summon" {
  interface OverlayRegistry {
    pdfBatchExtractDebugWindow: OverlayWire<PdfBatchExtractDebugWindowDefinitionData>;
  }
}
