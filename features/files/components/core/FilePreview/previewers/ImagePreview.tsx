/**
 * features/files/components/core/FilePreview/previewers/ImagePreview.tsx
 *
 * Light previewer — just an <img> + a friendly empty/error state. Uses the
 * browser to cache; no blob fetching on our side.
 */

"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ImagePreviewProps {
  url: string | null;
  fileName: string;
  className?: string;
}

export function ImagePreview({ url, fileName, className }: ImagePreviewProps) {
  const [errored, setErrored] = useState(false);

  if (!url) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-muted/30",
          className,
        )}
      >
        <div className="h-10 w-10 animate-pulse rounded bg-muted" />
      </div>
    );
  }

  if (errored) {
    return (
      <div
        className={cn(
          "flex h-full w-full flex-col items-center justify-center gap-2 bg-muted/30 text-muted-foreground",
          className,
        )}
      >
        <AlertCircle className="h-6 w-6" />
        <span className="text-xs">Preview unavailable.</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center overflow-hidden bg-muted/20",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={fileName}
        className="max-h-full max-w-full object-contain"
        onError={() => setErrored(true)}
      />
    </div>
  );
}

export default ImagePreview;
