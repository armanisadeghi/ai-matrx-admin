/**
 * features/files/media-client/useImageSrc.ts
 *
 * A durable media ref → a URL an `<img>` (or a canvas `Image`) can load right
 * now. `resolution.src` alone is NOT that: for private/unknown-visibility
 * images the client answers `transport: "blob"`, meaning the bytes must come
 * through its bearer-authenticated `getBlob` lane. Binding `resolution.src`
 * straight to `<img>` skips that and renders a broken image (the scanner's
 * cleaned-page thumbnails, 2026-10-22; the same class `useBlockMediaSource`
 * fixed for blocks).
 */

"use client";

import type { MediaRefLike } from "@ai-matrx/media";
import { useMediaBlob, useMediaResolution } from "@ai-matrx/media/core";

export interface ImageSrcState {
  /** Loadable URL, or null while loading / when unavailable. */
  src: string | null;
  /** True while the private-pixels bytes are still on their way. */
  loading: boolean;
  /** True when the ref was refused or its bytes failed to load. */
  failed: boolean;
}

export function useImageSrc(ref: MediaRefLike | null | undefined): ImageSrcState {
  const { resolution, status } = useMediaResolution(ref);
  const needsBlob = resolution?.transport === "blob";
  const blob = useMediaBlob(needsBlob ? ref : null);

  if (!resolution) {
    return { src: null, loading: false, failed: status === "unavailable" };
  }
  if (!needsBlob) {
    return { src: resolution.src, loading: false, failed: false };
  }
  return {
    src: blob.url,
    loading: blob.loading || (!blob.url && !blob.error),
    failed: Boolean(blob.error),
  };
}
