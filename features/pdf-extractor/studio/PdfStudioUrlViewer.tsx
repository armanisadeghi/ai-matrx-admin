"use client";

/**
 * PdfStudioUrlViewer — URL-driven thin wrapper around the shared
 * `<PdfDocumentRenderer/>` core used by every PDF surface in the app.
 *
 * Why a separate file (vs `PdfPreview` directly)
 * ──────────────────────────────────────────────
 * `PdfPreview` requires a `cld_files.id` because it fetches bytes
 * through the Python `/files/{id}/download` proxy. The PDF Studio's
 * documents are `processed_documents` rows whose original PDF is
 * stored in Supabase Storage and reachable via `storage_uri`. We can't
 * gate the studio's viewer on `source_kind === 'cld_file'` — that
 * leaves freshly-uploaded docs with a useless "open in new tab"
 * fallback.
 *
 * What it does
 * ────────────
 * 1. Fetches the storage URL with `fetch()`.
 * 2. Wraps the response bytes as a `Blob` and creates a `blob:` URL.
 * 3. Hands that to the shared `PdfDocumentRenderer`.
 *
 * The toolbar (zoom in/out, fit page, fit width, actual size, rotate),
 * pagination, ResizeObserver-driven sizing math, error / loading UI —
 * all of it lives in `PdfDocumentRenderer`. This file's job is just to
 * obtain the bytes.
 *
 * Supabase Storage public-bucket URLs ship with permissive CORS on
 * GET, so the fetch succeeds without a server proxy. If a deployment
 * ever changes that, swap the fetch for a Python proxy — nothing else
 * in here has to change.
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// react-pdf + pdfjs-dist is ~400KB; defer until the renderer mounts.
// We dynamically import the renderer (not just react-pdf) because the
// renderer module's top-level executes the worker-source assignment
// — no point pulling that in until a viewer actually opens.
const PdfDocumentRenderer = dynamic(
  () =>
    import("@/features/files/components/core/FilePreview/previewers/PdfDocumentRenderer"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-muted/20">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    ),
  },
);

export interface PdfStudioUrlViewerProps {
  /** Public/signed storage URL of the PDF. */
  url: string;
  /** Optional filename — drives the loading / error UI. */
  fileName?: string | null;
  /** Optional controlled page number (1-based). */
  pageNumber?: number;
  onPageChange?: (page: number) => void;
  className?: string;
}

export default function PdfStudioUrlViewer({
  url,
  fileName,
  pageNumber,
  onPageChange,
  className,
}: PdfStudioUrlViewerProps) {
  // Fetch the URL into a same-origin blob so pdfjs's worker can read
  // it without re-issuing a CORS-prone fetch.
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Progress for the determinate progress bar in the renderer's
  // loading UI. We use the standard `Response.body` reader rather
  // than just `res.blob()` so multi-megabyte documents show real
  // progress instead of an indeterminate spinner.
  const [bytesLoaded, setBytesLoaded] = useState(0);
  const [bytesTotal, setBytesTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!url) {
      setBlobUrl(null);
      return;
    }
    let cancelled = false;
    let createdUrl: string | null = null;
    setLoading(true);
    setError(null);
    setBytesLoaded(0);
    setBytesTotal(null);

    (async () => {
      try {
        const res = await fetch(url, { credentials: "omit" });
        if (!res.ok) {
          throw new Error(
            `${res.status} ${res.statusText} when fetching the PDF`,
          );
        }
        // Stream-read so we can report progress. `Content-Length` may
        // be absent (e.g. transfer-encoded responses); fall back to
        // null so the renderer shows an indeterminate pulse instead
        // of "0%".
        const contentLength = res.headers.get("content-length");
        const total = contentLength ? Number.parseInt(contentLength, 10) : null;
        if (total != null && Number.isFinite(total)) setBytesTotal(total);

        const reader = res.body?.getReader();
        const chunks: Uint8Array<ArrayBuffer>[] = [];
        let received = 0;
        if (reader) {
          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (cancelled) {
              await reader.cancel();
              return;
            }
            if (value) {
              chunks.push(value);
              received += value.byteLength;
              setBytesLoaded(received);
            }
          }
        }
        if (cancelled) return;

        // Reassemble. `new Blob([...Uint8Array])` works directly so
        // we don't need to copy into a single ArrayBuffer.
        const blob = new Blob(chunks, {
          type: res.headers.get("content-type") ?? "application/pdf",
        });
        createdUrl = URL.createObjectURL(blob);
        setBlobUrl(createdUrl);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load PDF");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [url]);

  return (
    <PdfDocumentRenderer
      blobUrl={blobUrl}
      fileName={fileName ?? null}
      loading={loading}
      bytesLoaded={bytesLoaded}
      bytesTotal={bytesTotal}
      error={error}
      pageNumber={pageNumber}
      onPageChange={onPageChange}
      className={cn(className)}
    />
  );
}
