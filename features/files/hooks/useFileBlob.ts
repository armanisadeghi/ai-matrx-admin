/**
 * features/files/hooks/useFileBlob.ts
 *
 * Fetch a file's bytes via the Python `GET /files/{id}/download` endpoint
 * and return a `blob:` URL that any browser API (`<img>`, react-pdf,
 * `fetch`, etc.) can consume without triggering CORS.
 *
 * Why this exists
 * ───────────────
 * The cloud-files signed-URL endpoint (`GET /files/{id}/url`) returns a
 * direct S3 presigned URL. That URL works for HTML elements that don't
 * trigger CORS (`<img>`, `<video>`, `<audio>`, `<iframe>`, anchor
 * navigation), but `fetch(signedUrl)` ALWAYS triggers a CORS preflight.
 * If the S3 bucket isn't configured to allow our origin, the fetch
 * fails with a 403 — which is exactly what was breaking PDF / Markdown
 * / CSV / TXT previews.
 *
 * The Python `/files/{id}/download` endpoint streams the bytes through
 * FastAPI (which already has CORS configured for our origins). Routing
 * fetch-based previewers through it sidesteps the S3-CORS issue
 * entirely until the bucket CORS policy is fixed (logged for the
 * Python/admin team — see ARCHITECTURE_FLAWS.md item P-8).
 *
 * The blob URL is revoked automatically when the component unmounts or
 * when the fileId changes, so memory pressure stays bounded.
 *
 * Usage:
 *   const { url, loading, error, retry } = useFileBlob(fileId);
 *   <PdfDocument file={url} />
 */

"use client";

import { useEffect, useState } from "react";
import * as Files from "@/features/files/api/files";
import { extractErrorMessage } from "@/utils/errors";

export interface UseFileBlobResult {
  /** `blob:`-scheme URL safe to feed into any browser API. `null` until ready. */
  url: string | null;
  /** Underlying Blob — useful for callers that need the raw bytes. */
  blob: Blob | null;
  loading: boolean;
  error: string | null;
  /** Force a re-fetch (e.g. after auth refresh). */
  retry: () => void;
}

export function useFileBlob(fileId: string | null): UseFileBlobResult {
  const [url, setUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState<boolean>(!!fileId);
  const [error, setError] = useState<string | null>(null);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!fileId) {
      setUrl(null);
      setBlob(null);
      setLoading(false);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);

    Files.downloadFile(fileId)
      .then(({ blob: b }) => {
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(b);
        setBlob(b);
        setUrl(objectUrl);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(extractErrorMessage(err) || "Failed to load file");
        setLoading(false);
      });

    return () => {
      cancelled = true;
      // Revoke the previous object URL — guards against memory leak when
      // fileId changes or the component unmounts.
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setBlob(null);
    };
  }, [fileId, retryToken]);

  return {
    url,
    blob,
    loading,
    error,
    retry: () => setRetryToken((t) => t + 1),
  };
}
