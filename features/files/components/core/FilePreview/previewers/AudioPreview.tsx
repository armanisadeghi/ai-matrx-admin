/**
 * features/files/components/core/FilePreview/previewers/AudioPreview.tsx
 */

"use client";

import { Music } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AudioPreviewProps {
  url: string | null;
  fileName: string;
  mimeType: string | null;
  className?: string;
}

export function AudioPreview({
  url,
  fileName,
  mimeType,
  className,
}: AudioPreviewProps) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-center gap-6 p-6",
        className,
      )}
    >
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
        <Music className="h-12 w-12 text-pink-500" aria-hidden="true" />
      </div>
      <div className="w-full max-w-md text-center">
        <p className="truncate text-sm font-medium">{fileName}</p>
      </div>
      {url ? (
        <audio controls src={url} className="w-full max-w-md">
          <source src={url} type={mimeType ?? undefined} />
        </audio>
      ) : (
        <div className="h-10 w-full max-w-md animate-pulse rounded bg-muted" />
      )}
    </div>
  );
}

export default AudioPreview;
