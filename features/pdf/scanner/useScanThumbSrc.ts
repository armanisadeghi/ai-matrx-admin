/**
 * The image a scan page shows: its enhanced derivative when one exists (so
 * Clean/Auto/Grayscale/B&W are visible everywhere the page appears), else the
 * local preview, else the uploaded original (resumed sessions have no local
 * preview). While a new derivative's bytes load, the previous image stays up
 * and `updating` is true so the caller can show progress.
 */

import { useState } from "react";

import { useImageSrc } from "@/features/files/media-client/useImageSrc";

import type { ScanItem } from "./types";

export interface ScanImageSrc {
  src: string | null;
  /** A newer version (the enhanced derivative) is still loading. */
  updating: boolean;
  /** The enhanced version could not be shown; `src` is the original. */
  enhanceFailed: boolean;
}

export function useScanImageSrc(
  item: Pick<ScanItem, "kind" | "fileId" | "previewUrl">,
  enhancedFileId: string | undefined,
): ScanImageSrc {
  const isImage = item.kind === "image";
  const enhanced = useImageSrc(isImage ? (enhancedFileId ?? null) : null);
  const original = useImageSrc(
    isImage && !item.previewUrl ? (item.fileId ?? null) : null,
  );
  const base = item.previewUrl ?? original.src ?? null;

  // Re-enhancing (Clean → B&W, Clean all) keeps the last enhanced image up
  // while the new one loads, instead of flashing back to the original.
  const [lastEnhanced, setLastEnhanced] = useState<string | null>(null);
  if (enhanced.src && enhanced.src !== lastEnhanced) {
    setLastEnhanced(enhanced.src);
  }
  if (enhanced.src) {
    return { src: enhanced.src, updating: false, enhanceFailed: false };
  }
  if (enhancedFileId && enhanced.loading && lastEnhanced) {
    return { src: lastEnhanced, updating: true, enhanceFailed: false };
  }
  return {
    src: base,
    updating: enhanced.loading || (!base && original.loading),
    enhanceFailed: enhanced.failed,
  };
}

export function useScanThumbSrc(item: ScanItem): ScanImageSrc {
  return useScanImageSrc(item, item.enhancedFileId);
}
