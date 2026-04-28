/**
 * features/files/components/core/FilePreview/previewers/PdfPreview.tsx
 *
 * Lazy-loaded PDF renderer. react-pdf + pdfjs-dist is ~400KB — only pulled
 * into the bundle when a user opens a PDF.
 *
 * NOTE: this file is itself dynamically imported by FilePreview (see
 * ../FilePreview.tsx). That ensures non-PDF previews never pay the PDF
 * bundle cost.
 *
 * Bytes are fetched through the Python `/files/{id}/download` endpoint via
 * `useFileBlob` rather than the S3 signed URL — same-origin blob means
 * react-pdf's worker fetch is CORS-safe regardless of the bucket policy.
 *
 * Sizing model: we measure the container with a `ResizeObserver` and pass
 * an explicit `width` to `<Page>`. By default we fit the page to the
 * container width (so portrait + landscape both render at full readable
 * size without cutting off). The user can switch to "Actual size" or
 * dial a custom zoom percentage. Rotation is supported per-page so
 * sideways scans become readable in one click.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Minus,
  Plus,
  RotateCw,
  Scaling,
} from "lucide-react";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { cn } from "@/lib/utils";
import { useFileBlob } from "@/features/files/hooks/useFileBlob";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectFileById } from "@/features/files/redux/selectors";
import { TooltipIcon } from "@/features/files/components/core/Tooltip/TooltipIcon";
import { FileFetchProgress } from "../FileFetchProgress";

// Worker source — pinned to the installed pdfjs version.
if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

export interface PdfPreviewProps {
  fileId: string;
  className?: string;
}

type ZoomMode =
  | { kind: "fit-width" }
  | { kind: "actual" }
  | { kind: "scale"; scale: number };

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const STEP = 0.25;
// react-pdf renders pages at 1.0 = 72 DPI which is too small on hi-DPI
// monitors. "Actual size" maps to 1.5x — matches what most desktop PDF
// viewers feel like at 100%.
const ACTUAL_SIZE_SCALE = 1.5;

export default function PdfPreview({ fileId, className }: PdfPreviewProps) {
  // Same-origin blob URL via the Python download endpoint — sidesteps S3
  // CORS that would otherwise 403 a `fetch()` from pdfjs's worker.
  const {
    url,
    loading: blobLoading,
    bytesLoaded,
    bytesTotal,
    error: blobError,
  } = useFileBlob(fileId);
  const file = useAppSelector((s) => (fileId ? selectFileById(s, fileId) : null));

  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<ZoomMode>({ kind: "fit-width" });
  const [rotation, setRotation] = useState(0);

  // Container width — drives fit-width sizing. Updated via ResizeObserver
  // so the page rescales on splitter drags / window resizes without a
  // re-mount.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    setContainerWidth(node.clientWidth);
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  // Memoize the file descriptor so react-pdf doesn't reload on every render.
  const documentFile = useMemo(() => (url ? { url } : null), [url]);

  const combinedError = loadError ?? blobError;

  // Compute the explicit page width to feed react-pdf. Using `width` is
  // friendlier than `scale` because the page renders crisply at the target
  // size on hi-DPI displays — pdfjs handles the device-pixel-ratio math.
  const pageWidth = useMemo(() => {
    // 32px of margin on each side keeps the page from kissing the scrollbar.
    const available = Math.max(280, containerWidth - 32);
    if (zoom.kind === "fit-width") return available;
    if (zoom.kind === "actual") return available * ACTUAL_SIZE_SCALE;
    return available * zoom.scale;
  }, [containerWidth, zoom]);

  // What to show in the zoom-percentage label. For fit-width we'd need to
  // know the page's natural width to compute, so we just say "Fit".
  const zoomLabel = useMemo(() => {
    if (zoom.kind === "fit-width") return "Fit";
    if (zoom.kind === "actual") return "100%";
    return `${Math.round(zoom.scale * 100)}%`;
  }, [zoom]);

  const currentScale =
    zoom.kind === "scale"
      ? zoom.scale
      : zoom.kind === "actual"
        ? ACTUAL_SIZE_SCALE
        : 1;

  const stepZoom = (delta: number) => {
    setZoom({
      kind: "scale",
      scale: Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, currentScale + delta),
      ),
    });
  };

  if (combinedError) {
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
            {combinedError}
          </p>
        </div>
      </div>
    );
  }

  if (blobLoading || !documentFile) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-muted/20",
          className,
        )}
      >
        <FileFetchProgress
          fileName={file?.fileName ?? null}
          bytesLoaded={bytesLoaded}
          bytesTotal={bytesTotal}
        />
      </div>
    );
  }

  return (
    <div className={cn("flex h-full w-full flex-col bg-muted/20", className)}>
      {/* Toolbar — zoom + rotate + page nav. */}
      <div className="flex items-center justify-between gap-2 border-b border-border/60 bg-background/80 px-3 py-1.5 text-xs shrink-0">
        <div className="flex items-center gap-1">
          <TooltipIcon label="Zoom out">
            <button
              type="button"
              onClick={() => stepZoom(-STEP)}
              disabled={currentScale <= MIN_SCALE}
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
          </TooltipIcon>
          <span className="min-w-[3.5rem] text-center text-xs font-medium tabular-nums">
            {zoomLabel}
          </span>
          <TooltipIcon label="Zoom in">
            <button
              type="button"
              onClick={() => stepZoom(+STEP)}
              disabled={currentScale >= MAX_SCALE}
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </TooltipIcon>
          <span className="mx-1 h-4 w-px bg-border" />
          <TooltipIcon label="Fit width">
            <button
              type="button"
              onClick={() => setZoom({ kind: "fit-width" })}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground",
                zoom.kind === "fit-width" &&
                  "bg-accent text-accent-foreground",
              )}
            >
              <Maximize className="h-3.5 w-3.5" />
            </button>
          </TooltipIcon>
          <TooltipIcon label="Actual size (100%)">
            <button
              type="button"
              onClick={() => setZoom({ kind: "actual" })}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground",
                zoom.kind === "actual" && "bg-accent text-accent-foreground",
              )}
            >
              <Scaling className="h-3.5 w-3.5" />
            </button>
          </TooltipIcon>
          <span className="mx-1 h-4 w-px bg-border" />
          <TooltipIcon label="Rotate 90°">
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          </TooltipIcon>
        </div>

        {numPages > 1 ? (
          <div
            className="flex items-center gap-1.5"
            aria-label="PDF pagination"
          >
            <button
              type="button"
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              aria-label="Previous page"
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="min-w-[3.5rem] text-center font-medium tabular-nums">
              {pageNumber} / {numPages}
            </span>
            <button
              type="button"
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              disabled={pageNumber >= numPages}
              aria-label="Next page"
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-40"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}
      </div>

      {/* Scrollable viewport — measured with ResizeObserver so fit-width
          adapts to splitter drags. */}
      <div
        ref={containerRef}
        className="min-h-0 flex-1 overflow-auto"
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
          className="flex w-full flex-col items-center"
        >
          <Page
            pageNumber={pageNumber}
            renderAnnotationLayer
            renderTextLayer
            // Drive sizing by explicit width so fit-width and zoom % both
            // produce a crisp render at the right device pixels. react-pdf
            // handles devicePixelRatio internally.
            width={pageWidth > 0 ? pageWidth : undefined}
            rotate={rotation}
            className="my-4 shadow-sm"
          />
        </Document>
      </div>
    </div>
  );
}
