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

import { useState } from "react";
import type { MediaRefLike } from "@ai-matrx/media";
import {
  stableRefKey,
  useMediaBlob,
  useMediaResolution,
} from "@ai-matrx/media/core";

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

  // `useMediaBlob` resets only after commit, so right after the ref changes
  // it still holds the PREVIOUS ref's url/error. Treat its state as stale
  // until it has visibly started loading the new ref.
  const key = stableRefKey(ref);
  const [seen, setSeen] = useState({ key, stale: false });
  if (seen.key !== key) setSeen({ key, stale: true });
  else if (seen.stale && blob.loading) setSeen({ key, stale: false });
  const stale = seen.key !== key || seen.stale;
  const blobUrl = stale ? null : blob.url;
  const blobError = stale ? null : blob.error;

  if (!resolution) {
    return { src: null, loading: false, failed: status === "unavailable" };
  }
  if (!needsBlob) {
    return { src: resolution.src, loading: false, failed: false };
  }
  return {
    src: blobUrl,
    loading: !blobUrl && !blobError,
    failed: !blobUrl && Boolean(blobError),
  };
}
