"use client";

/**
 * features/code/editor/BinaryFilePdfPreview.tsx
 *
 * Sandbox-editor PDF previewer. Thin wrapper around the shared
 * `<PdfDocumentRenderer/>` core used by every PDF surface.
 *
 * The sandbox editor already owns the PDF's bytes as a Blob (the
 * filesystem adapter handed it directly), so all this wrapper does is
 * forward the existing `blob:` URL into the renderer. Zoom, fit-page
 * math, rotate, pagination, error UI all come from the core.
 *
 * Lazy-loaded by `BinaryFileViewer` so non-PDF callers never pay the
 * react-pdf bundle cost (~400KB + the pdfjs worker).
 */

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Defer the renderer (which imports react-pdf + sets the worker URL)
// until this previewer actually mounts.
const PdfDocumentRenderer = dynamic(
  () =>
    import(
      "@/features/files/components/core/FilePreview/previewers/PdfDocumentRenderer"
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted/20">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

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
  // The blob is held by the parent purely for the download path; we
  // keep it in the prop list so callers don't have to pass two stable
  // refs.
  void blob;

  return (
    <PdfDocumentRenderer
      blobUrl={url}
      fileName={fileName}
      className={cn(className)}
    />
  );
}

export default BinaryFilePdfPreview;
