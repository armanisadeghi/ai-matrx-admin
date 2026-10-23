import type { PdfDocument } from "@/features/pdf-extractor/hooks/usePdfExtractor";
import type { PdfPageRow } from "@/features/pdf/data/pdfPages";

/**
 * What the Document tool (the extractor inside the PDF workspace) publishes for the page-level agent surface
 * `matrx-user/pdf-extractor`. A plain mutable box: the surface reads it at trigger time, so it never causes a render.
 */
export interface ExtractorSnapshot {
  doc: PdfDocument | null;
  pages: PdfPageRow[];
  running: boolean;
  status: string;
}

export interface ExtractorBridge {
  snapshot: ExtractorSnapshot;
}

export const EMPTY_EXTRACTOR_SNAPSHOT: ExtractorSnapshot = { doc: null, pages: [], running: false, status: "" };
