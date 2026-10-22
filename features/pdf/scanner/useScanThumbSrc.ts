/**
 * The image a scan page's thumbnail shows: its enhanced derivative when one
 * exists (so Clean/B&W are visible in the review), else the local preview,
 * else the uploaded original (resumed sessions have no local preview).
 */

import { useMediaResolution } from "@ai-matrx/media/core";

import type { ScanItem } from "./types";

export function useScanThumbSrc(item: ScanItem): string | null {
  const remoteId =
    item.kind !== "image"
      ? null
      : (item.enhancedFileId ??
        (item.previewUrl ? null : (item.fileId ?? null)));
  const remoteSrc = useMediaResolution(remoteId).resolution?.src ?? null;
  return remoteSrc ?? item.previewUrl ?? null;
}
