/**
 * features/files/components/core/FilePreview/previewers/TextPreview.tsx
 *
 * Fetches the file text and renders it in a <pre>. Falls back to a
 * "too large" warning past 1MB (we don't want to blow out memory on a
 * 500MB log file).
 */

"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFileBlob } from "@/features/files/hooks/useFileBlob";

export interface TextPreviewProps {
  fileId: string;
  /** Max bytes to fetch. Defaults 1MB. */
  maxBytes?: number;
  className?: string;
}

export function TextPreview({
  fileId,
  maxBytes = 1024 * 1024,
  className,
}: TextPreviewProps) {
  // Pulls bytes via the Python `/files/{id}/download` endpoint and gives
  // us a `blob:` URL. Same-origin, JWT-authenticated, CORS-safe — no S3
  // signed-URL hosts ever hit the browser fetch path.
  const { blob, loading: blobLoading, error: blobError } = useFileBlob(fileId);

  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    if (!blob) return;
    let cancelled = false;
    setError(null);
    setText(null);
    setTruncated(false);
    (async () => {
      try {
        if (blob.size > maxBytes) {
          const slice = blob.slice(0, maxBytes);
          if (cancelled) return;
          setTruncated(true);
          setText(await slice.text());
        } else {
          setText(await blob.text());
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [blob, maxBytes]);

  // Surface the underlying download error verbatim so users see the real
  // backend response (HTTP 401 / 403 / 404 / network) instead of a
  // generic "Preview failed".
  const combinedError = error ?? blobError;

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
          <h3 className="text-sm font-semibold">Couldn&apos;t load this file</h3>
          <p className="max-w-md text-xs text-muted-foreground break-words">
            {combinedError}
          </p>
        </div>
      </div>
    );
  }

  if (blobLoading || text == null) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center",
          className,
        )}
      >
        <div className="h-6 w-40 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <div
      className={cn("flex h-full w-full flex-col overflow-hidden", className)}
    >
      {truncated ? (
        <div className="px-3 py-1 text-xs text-muted-foreground bg-muted/30 border-b">
          Preview limited to first {(maxBytes / 1024 / 1024).toFixed(0)}MB.
        </div>
      ) : null}
      <pre className="flex-1 overflow-auto p-3 text-xs leading-5 font-mono whitespace-pre-wrap break-words bg-background">
        {text}
      </pre>
    </div>
  );
}

export default TextPreview;
