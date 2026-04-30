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
 * Sizing model — proper fit:
 *   1. Measure both container width AND height via ResizeObserver.
 *   2. Read the page's natural dimensions on first load (post-intrinsic-
 *      rotation) and apply the user's rotation choice on top.
 *   3. Compute `scale = min(availableWidth / effectiveW, availableHeight
 *      / effectiveH)` — the page expands until *one* axis matches its
 *      available space, then stops. Neither dimension overflows; the
 *      page uses every pixel one of the axes can give it.
 *   4. Pass `scale` (not `width`) to `<Page>` so the rotation math is
 *      handled internally.
 *
 * Other zoom modes — Fit Width (legacy: width only, page may exceed
 * vertical space and scroll), Actual size (100% physical), and explicit
 * percentages.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Maximize,
  Maximize2,
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
  // Fit page — biggest scale that keeps BOTH width and height inside the
  // available space. Default. This is the proper definition of "fit".
  | { kind: "fit" }
  // Fit width — biggest scale where page width matches available width;
  // height may overflow and scroll. Useful for tall pages where you'd
  // rather scroll than have small text.
  | { kind: "fit-width" }
  // 100% physical size — page renders at its natural pixel size.
  | { kind: "actual" }
  // Explicit zoom level (0.25 → 4.0).
  | { kind: "scale"; scale: number };

const MIN_SCALE = 0.25;
const MAX_SCALE = 4;
const STEP = 0.25;
// react-pdf renders pages at 1.0 = 72 DPI which is too small on hi-DPI
// monitors. "Actual size" maps to 1.5x — matches what most desktop PDF
// viewers feel like at 100%.
const ACTUAL_SIZE_SCALE = 1.5;
// Reserve a few px of padding on each side so the page doesn't kiss the
// scrollbar / border.
const VIEWPORT_PADDING_PX = 24;

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
  const [zoom, setZoom] = useState<ZoomMode>({ kind: "fit" });
  const [rotation, setRotation] = useState(0);
  // Page natural dimensions — width / height in CSS pixels at scale 1.0,
  // already including any intrinsic rotation the PDF declares. Populated
  // from `<Page onLoadSuccess>`. We need the height to compute a true
  // fit-page scale (existing fit-width math only used container width).
  const [pageDims, setPageDims] = useState<{ width: number; height: number } | null>(null);

  // Container width AND height — both drive fit calculations. Updated via
  // ResizeObserver so the page rescales on splitter drags / window
  // resizes without a re-mount.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerSize, setContainerSize] = useState<{
    width: number;
    height: number;
  }>({ width: 0, height: 0 });
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    setContainerSize({ width: node.clientWidth, height: node.clientHeight });
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setContainerSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    ro.observe(node);
    return () => ro.disconnect();
  }, []);

  // Memoize the file descriptor so react-pdf doesn't reload on every render.
  const documentFile = useMemo(() => (url ? { url } : null), [url]);

  const combinedError = loadError ?? blobError;

  /**
   * The page's effective natural dimensions AFTER the user's rotation —
   * for 90°/270° we swap width and height because rotation flips the
   * displayed orientation. These are the dimensions we measure against
   * the container when computing fit.
   */
  const effectiveDims = useMemo(() => {
    if (!pageDims) return null;
    const flipped = rotation === 90 || rotation === 270;
    return flipped
      ? { width: pageDims.height, height: pageDims.width }
      : pageDims;
  }, [pageDims, rotation]);

  /**
   * Compute the `scale` we hand to `<Page>`. We use `scale` (not `width`)
   * because it composes correctly with rotation: react-pdf rotates AFTER
   * scaling the page's natural dimensions. So:
   *
   *   renderedWidth  = effectiveDims.width  * scale
   *   renderedHeight = effectiveDims.height * scale
   *
   * For "fit" — the proper definition — we want the page to expand until
   * EITHER axis fills its available space, whichever happens first. That
   * is `scale = min(availableW / effectiveW, availableH / effectiveH)`.
   */
  const pageScale = useMemo(() => {
    if (!effectiveDims || effectiveDims.width <= 0 || effectiveDims.height <= 0) {
      return null;
    }
    const availW = Math.max(120, containerSize.width - VIEWPORT_PADDING_PX * 2);
    const availH = Math.max(120, containerSize.height - VIEWPORT_PADDING_PX * 2);
    switch (zoom.kind) {
      case "fit": {
        const sX = availW / effectiveDims.width;
        const sY = availH / effectiveDims.height;
        return Math.min(sX, sY);
      }
      case "fit-width":
        return availW / effectiveDims.width;
      case "actual":
        return ACTUAL_SIZE_SCALE;
      case "scale":
        return zoom.scale;
    }
  }, [containerSize, effectiveDims, zoom]);

  // Label for the zoom indicator. "Fit" / "Fit W" / explicit percent.
  const zoomLabel = useMemo(() => {
    if (zoom.kind === "fit") {
      return pageScale ? `Fit ${Math.round(pageScale * 100)}%` : "Fit";
    }
    if (zoom.kind === "fit-width") {
      return pageScale ? `Fit W ${Math.round(pageScale * 100)}%` : "Fit W";
    }
    if (zoom.kind === "actual") return "100%";
    return `${Math.round(zoom.scale * 100)}%`;
  }, [zoom, pageScale]);

  // The "current effective scale" used by the zoom-step buttons so +/-
  // bumps from the actual rendered size, not from a stale fit value.
  const currentScale =
    zoom.kind === "scale"
      ? zoom.scale
      : zoom.kind === "actual"
        ? ACTUAL_SIZE_SCALE
        : (pageScale ?? 1);

  const stepZoom = (delta: number) => {
    setZoom({
      kind: "scale",
      scale: Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, currentScale + delta),
      ),
    });
  };

  const handlePageLoadSuccess = useCallback(
    (page: {
      width: number;
      height: number;
      originalWidth?: number;
      originalHeight?: number;
    }) => {
      // CRITICAL: read `originalWidth`/`originalHeight`, not `width`/`height`.
      // The latter pair reflects the page's CURRENT rendered size — i.e.
      // post-scale. Feeding those back into `pageDims` creates a feedback
      // loop where every re-render shrinks the page (we compute scale from
      // already-scaled dims, then scale again). The `original*` props are
      // the natural PDF-points dimensions and stay constant across renders.
      const naturalW = page.originalWidth ?? page.width;
      const naturalH = page.originalHeight ?? page.height;
      setPageDims((prev) => {
        if (prev && prev.width === naturalW && prev.height === naturalH) {
          return prev;
        }
        return { width: naturalW, height: naturalH };
      });
    },
    [],
  );

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
          <TooltipIcon label="Fit page (default)">
            <button
              type="button"
              onClick={() => setZoom({ kind: "fit" })}
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground",
                zoom.kind === "fit" && "bg-accent text-accent-foreground",
              )}
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </TooltipIcon>
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
            // Use `scale` (not `width`) so rotation composes correctly:
            // react-pdf rotates the page after scaling, so we don't need
            // to swap width/height ourselves. devicePixelRatio handling
            // stays internal to pdfjs.
            scale={pageScale && pageScale > 0 ? pageScale : undefined}
            rotate={rotation}
            onLoadSuccess={handlePageLoadSuccess}
            className="my-4 shadow-sm"
          />
        </Document>
      </div>
    </div>
  );
}
