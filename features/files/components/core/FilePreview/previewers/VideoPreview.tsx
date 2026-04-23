/**
 * features/files/components/core/FilePreview/previewers/VideoPreview.tsx
 */

"use client";

import { cn } from "@/lib/utils";

export interface VideoPreviewProps {
  url: string | null;
  mimeType: string | null;
  className?: string;
}

export function VideoPreview({ url, mimeType, className }: VideoPreviewProps) {
  if (!url) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-black",
          className,
        )}
      >
        <div className="h-10 w-10 animate-pulse rounded bg-muted" />
      </div>
    );
  }
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-black",
        className,
      )}
    >
      <video
        controls
        src={url}
        className="max-h-full max-w-full"
        preload="metadata"
      >
        <source src={url} type={mimeType ?? undefined} />
      </video>
    </div>
  );
}

export default VideoPreview;
