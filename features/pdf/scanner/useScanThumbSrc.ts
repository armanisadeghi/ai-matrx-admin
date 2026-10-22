/**
 * The image a scan page shows: its enhanced derivative when one exists (so
 * Clean/Auto/Grayscale/B&W are visible everywhere the page appears), else the
 * local preview, else the uploaded original (resumed sessions have no local
 * preview). Every uploaded file loads through `useMediaSrc` — derivatives are
 * private, and their bytes must come through the bearer lane.
 *
 * While a new derivative loads, the previous enhanced image stays up and
 * `updating` is true, so a re-enhance never flashes back to the original.
 */

import { useState } from "react";
import { useMediaSrc } from "@ai-matrx/media/core";

import type { ScanItem } from "./types";

export interface ScanImageSrc {
  src: string | null;
  /** A newer version (the enhanced derivative) is still loading. */
  updating: boolean;
  /** The enhanced version could not be shown; `src` is the original. */
  enhanceFailed: boolean;
  /** Nothing can be shown: the uploaded original failed to load. */
  failed: boolean;
  /** Wire to the `<img>`'s onError: the client's one recovery contract. */
  onLoadError: (event?: unknown) => void;
  /** Key the `<img>` on this so an approved retry re-requests. */
  retryKey: string;
}

export function useScanImageSrc(
  item: Pick<ScanItem, "kind" | "fileId" | "previewUrl">,
  enhancedFileId: string | undefined,
): ScanImageSrc {
  const isImage = item.kind === "image";
  // crossOrigin: the crop sheet draws these on a canvas (rotation), so even a
  // public CDN copy arrives as same-origin bytes and never taints it.
  const enhanced = useMediaSrc(
    isImage && enhancedFileId ? { file_id: enhancedFileId } : null,
    { crossOrigin: true },
  );
  const original = useMediaSrc(
    isImage && !item.previewUrl && item.fileId ? { file_id: item.fileId } : null,
    { crossOrigin: true },
  );
  const originalSrc = original.failed ? null : original.src;
  const base = item.previewUrl ?? originalSrc;

  // The last enhanced image that actually loaded, held across a re-enhance.
  const enhancedSrc = enhanced.failed ? null : enhanced.src;
  const [lastEnhanced, setLastEnhanced] = useState<string | null>(null);
  if (enhancedSrc && enhancedSrc !== lastEnhanced) setLastEnhanced(enhancedSrc);

  if (enhancedSrc) {
    return {
      src: enhancedSrc,
      updating: false,
      enhanceFailed: false,
      failed: false,
      onLoadError: enhanced.onLoadError,
      retryKey: `e${enhanced.retryKey}`,
    };
  }
  const waitingForEnhanced = Boolean(enhancedFileId) && enhanced.loading;
  const fallbackLoad = item.previewUrl
    ? () => {}
    : original.onLoadError;
  return {
    src: waitingForEnhanced && lastEnhanced ? lastEnhanced : base,
    updating: waitingForEnhanced || (!base && original.loading),
    enhanceFailed: Boolean(enhancedFileId) && enhanced.failed,
    failed: !item.previewUrl && original.failed,
    onLoadError: fallbackLoad,
    retryKey: `o${original.retryKey}`,
  };
}

export function useScanThumbSrc(item: ScanItem): ScanImageSrc {
  return useScanImageSrc(item, item.enhancedFileId);
}
