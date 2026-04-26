/**
 * features/files/components/core/MediaThumbnail/MediaThumbnail.tsx
 *
 * The single component that renders thumbnails in any cloud-files surface
 * (FileGrid, FileTableRow, picker preview chips, etc.). Picks the strategy
 * dictated by the file-type registry and never hard-codes "is image"
 * checks — extending thumbnail support means adding a new
 * `ThumbnailStrategy` to `utils/file-types.ts`, not editing this file's
 * data.
 *
 * Strategy → render path:
 *
 *   "image"          → `<img src={signedUrl}>`
 *   "video-poster"   → muted `<video preload="metadata">`; the browser
 *                       displays the first frame as a still poster
 *   "pdf-firstpage"  → reserved; falls back to icon today (pdfjs is too
 *                       heavy to load in folder listings without backend
 *                       prerendering — see for_python/REQUESTS.md)
 *   "backend-thumb"  → reads `metadata.thumbnail_url`. Fallback to icon
 *                       when missing (the field doesn't exist server-side
 *                       yet — Python team request logged)
 *   "icon"           → category icon at the requested size
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useSignedUrl } from "@/features/files/hooks/useSignedUrl";
import { getFilePreviewProfile } from "@/features/files/utils/file-types";
import { FileIcon } from "@/features/files/components/core/FileIcon/FileIcon";
import type { CloudFile } from "@/features/files/types";

export interface MediaThumbnailProps {
  file: Pick<CloudFile, "id" | "fileName" | "mimeType" | "fileSize" | "metadata">;
  /** Pixel size for the icon fallback. Image/video fill their container. */
  iconSize?: number;
  /** Aspect ratio classes applied to the container, e.g. "aspect-[4/3]". */
  className?: string;
  /** Override the rounded corners of the container. */
  rounded?: string;
}

export function MediaThumbnail({
  file,
  iconSize = 48,
  className,
  rounded,
}: MediaThumbnailProps) {
  const profile = getFilePreviewProfile(
    file.fileName,
    file.mimeType,
    file.fileSize,
  );

  const strategy = profile.thumbnailStrategy;

  // For strategies that need bytes (image / video), fetch a signed URL.
  const needsSignedUrl = strategy === "image" || strategy === "video-poster";
  const { url } = useSignedUrl(needsSignedUrl ? file.id : null, {
    expiresIn: 3600,
  });

  // Backend-thumbnail strategy reads the metadata field directly. The Python
  // team's contract for this field is logged in for_python/REQUESTS.md — until it
  // ships, this branch is dormant for every file.
  const backendUrl =
    strategy === "backend-thumb"
      ? readMetadataString(file.metadata, "thumbnail_url")
      : null;

  // Icon fallback — rendered as the default and revealed when an
  // image/video fails to load (e.g. HEIC on Chrome, broken signed URL).
  const fallback = (
    <div className="flex h-full w-full items-center justify-center bg-muted/40">
      <FileIcon fileName={file.fileName} size={iconSize} />
    </div>
  );

  let body: React.ReactNode = fallback;

  if (strategy === "image" && url) {
    body = (
      <ImageThumb
        url={url}
        alt={file.fileName}
        fallback={fallback}
      />
    );
  } else if (strategy === "video-poster" && url) {
    body = <VideoPosterThumb url={url} fallback={fallback} />;
  } else if (strategy === "backend-thumb" && backendUrl) {
    body = (
      <ImageThumb url={backendUrl} alt={file.fileName} fallback={fallback} />
    );
  }

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted/40",
        rounded,
        className,
      )}
    >
      {body}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function ImageThumb({
  url,
  alt,
  fallback,
}: {
  url: string;
  alt: string;
  fallback: React.ReactNode;
}) {
  const [errored, setErrored] = useState(false);
  // Reset the error state if the URL changes (signed-URL refresh, file swap).
  const lastUrlRef = useRef(url);
  if (lastUrlRef.current !== url && errored) {
    lastUrlRef.current = url;
    setErrored(false);
  } else if (lastUrlRef.current !== url) {
    lastUrlRef.current = url;
  }

  if (errored) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className="h-full w-full object-cover"
      onError={() => setErrored(true)}
    />
  );
}

function VideoPosterThumb({
  url,
  fallback,
}: {
  url: string;
  fallback: React.ReactNode;
}) {
  const [errored, setErrored] = useState(false);
  const ref = useRef<HTMLVideoElement | null>(null);

  // Some browsers refuse to render a frame until they explicitly know how
  // to seek. Setting `currentTime = 0` after metadata loads ensures the
  // first frame is decoded and displayed.
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onMeta = () => {
      try {
        v.currentTime = 0;
      } catch {
        /* ignore — some streams don't support setting currentTime */
      }
    };
    v.addEventListener("loadedmetadata", onMeta);
    return () => v.removeEventListener("loadedmetadata", onMeta);
  }, []);

  if (errored) return <>{fallback}</>;
  return (
    <video
      ref={ref}
      src={url}
      className="h-full w-full object-cover pointer-events-none"
      preload="metadata"
      muted
      playsInline
      onError={() => setErrored(true)}
    />
  );
}

function readMetadataString(
  metadata: Record<string, unknown> | undefined | null,
  key: string,
): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const v = (metadata as Record<string, unknown>)[key];
  return typeof v === "string" && v.length > 0 ? v : null;
}

export default MediaThumbnail;
