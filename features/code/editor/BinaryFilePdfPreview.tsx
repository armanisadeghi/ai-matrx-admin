"use client";

/**
 * features/code/editor/BinaryFilePdfPreview.tsx
 *
 * Standalone (blob-driven) PDF previewer for the sandbox editor. Mirrors
 * the cloud-files PdfPreview UX (page navigation, error card) but takes
 * a Blob/URL directly instead of pulling bytes through `useFileBlob` —
 * which is hard-coupled to the cloud-files Redux slice and the Python
 * `/files/{id}/download` endpoint.
 *
 * Lazy-loaded by `BinaryFileViewer` so non-PDF callers never pay the
 * react-pdf bundle cost (~400KB + the pdfjs worker).
 */

import { useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { AlertCircle, ChevronLeft, ChevronRight } from "lucide-react";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { cn } from "@/lib/utils";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

export interface BinaryFilePdfPreviewProps {
  /** Same-origin blob containing the PDF bytes. Owned by the parent. */
  blob: Blob;
  /**
   * `blob:` URL pinned to that Blob. Used as the document source —
   * react-pdf's Document accepts `{ url }` and the worker fetches the
   * same-origin blob without CORS friction.
   */
  url: string | null;
  fileName: string;
  className?: string;
}

export function BinaryFilePdfPreview({
  blob,
  url,
  fileName,
  className,
}: BinaryFilePdfPreviewProps) {
  // The blob is held by the parent purely for the download path; we keep
  // it in the prop list so callers don't have to pass two stable refs.
  void blob;
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);

  // react-pdf accepts `{ url }` (preferred for cached worker fetch).
  // The URL is owned by the parent (`BinaryFileViewer`) so seek/scroll
  // stays cheap and the worker reuses the cached bytes.
  const documentFile = useMemo(() => (url ? { url } : null), [url]);

  if (loadError) {
    return (
      <div
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-3 p-6 text-center",
          className,
        )}
        role="alert"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold">Couldn&apos;t load this PDF</h3>
          <p className="max-w-md text-xs text-muted-foreground break-words">
            {loadError}
          </p>
        </div>
      </div>
    );
  }

  if (!documentFile) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-muted/20",
          className,
        )}
      >
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center overflow-auto bg-muted/20",
        className,
      )}
    >
      <Document
        file={documentFile}
        onLoadSuccess={({ numPages: n }) => {
          setNumPages(n);
          setPageNumber((p) => Math.min(p, n));
        }}
        onLoadError={(err) => setLoadError(err.message)}
        loading={
          <div className="mt-6 h-6 w-40 animate-pulse rounded bg-muted" />
        }
      >
        <Page
          pageNumber={pageNumber}
          renderAnnotationLayer
          renderTextLayer
          className="mx-auto my-4"
        />
      </Document>

      {numPages > 1 ? (
        <div
          className="sticky bottom-2 mt-2 flex items-center gap-2 rounded-full border bg-background/90 px-3 py-1 text-xs shadow"
          aria-label={`PDF pagination — ${fileName}`}
        >
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
            disabled={pageNumber <= 1}
            aria-label="Previous page"
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="tabular-nums">
            {pageNumber} / {numPages}
          </span>
          <button
            type="button"
            onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
            disabled={pageNumber >= numPages}
            aria-label="Next page"
            className="flex h-6 w-6 items-center justify-center rounded hover:bg-accent disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default BinaryFilePdfPreview;
