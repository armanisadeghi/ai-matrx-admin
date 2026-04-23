/**
 * features/files/components/core/FilePreview/previewers/TextPreview.tsx
 *
 * Fetches the file text and renders it in a <pre>. Falls back to a
 * "too large" warning past 1MB (we don't want to blow out memory on a
 * 500MB log file).
 */

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface TextPreviewProps {
  url: string | null;
  /** Max bytes to fetch. Defaults 1MB. */
  maxBytes?: number;
  className?: string;
}

export function TextPreview({
  url,
  maxBytes = 1024 * 1024,
  className,
}: TextPreviewProps) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setError(null);
    setText(null);
    setTruncated(false);
    fetch(url)
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (cancelled) return;
        if (blob.size > maxBytes) {
          const slice = blob.slice(0, maxBytes);
          setTruncated(true);
          setText(await slice.text());
        } else {
          setText(await blob.text());
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [url, maxBytes]);

  if (error) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center text-sm text-destructive p-4",
          className,
        )}
      >
        Preview failed: {error}
      </div>
    );
  }

  if (text == null) {
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
