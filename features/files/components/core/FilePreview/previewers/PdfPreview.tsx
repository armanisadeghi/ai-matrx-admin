/**
 * features/files/components/core/FilePreview/previewers/PdfPreview.tsx
 *
 * Lazy-loaded PDF renderer. react-pdf + pdfjs-dist is ~400KB — only pulled
 * into the bundle when a user opens a PDF.
 *
 * NOTE: this file is itself dynamically imported by FilePreview (see
 * ../FilePreview.tsx). That ensures non-PDF previews never pay the PDF
 * bundle cost.
 */

"use client";

import { useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { AlertCircle, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { cn } from "@/lib/utils";

// Worker source — pinned to the installed pdfjs version.
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

export interface PdfPreviewProps {
  url: string | null;
  className?: string;
}

export default function PdfPreview({ url, className }: PdfPreviewProps) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const documentFile = useMemo(() => (url ? { url } : null), [url]);

  if (!documentFile) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-muted/20",
          className,
        )}
      >
        <div className="h-10 w-10 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (error) {
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
          <h3 className="text-sm font-semibold">Couldn't load this PDF</h3>
          <p className="max-w-md text-xs text-muted-foreground break-words">
            {error}
          </p>
        </div>
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open in new tab
          </a>
        ) : null}
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
        onLoadError={(err) => setError(err.message)}
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
          aria-label="PDF pagination"
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
