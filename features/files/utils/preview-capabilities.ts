/**
 * features/files/utils/preview-capabilities.ts
 *
 * Preview-capability helper. **The data + decision logic lives in
 * [./file-types.ts](./file-types.ts)** — this module is now a thin re-export
 * so legacy callers keep working without encoding a parallel mime / preview
 * table.
 *
 * Prefer the richer `getFilePreviewProfile` for new code: it returns the
 * preview kind, the canPreview / sizeOk flags, AND the thumbnail strategy
 * in a single call, removing the need to combine separate `mime.ts` +
 * `icon-map.ts` lookups at the call site.
 */

export {
  getFilePreviewProfile,
  MAX_INLINE_PREVIEW_BYTES,
} from "./file-types";

export type {
  FilePreviewProfile,
  PreviewKind,
  ThumbnailStrategy,
} from "./file-types";

import {
  getFilePreviewProfile,
  type PreviewKind,
} from "./file-types";

/**
 * Backwards-compat wrapper. New callers should use
 * `getFilePreviewProfile(...)` directly so they also see the
 * thumbnail strategy and resolved MIME.
 */
export interface PreviewCapability {
  previewKind: PreviewKind;
  canPreview: boolean;
  /** If false, show a download-first state instead of rendering. */
  sizeOk: boolean;
}

export function getPreviewCapability(
  fileName: string,
  mimeType: string | null,
  fileSize: number | null,
): PreviewCapability {
  const profile = getFilePreviewProfile(fileName, mimeType, fileSize);
  // Match the legacy shape: canPreview ignored size-ok, sizeOk was reported
  // separately. We restore that split so callers that gate on `canPreview`
  // alone (without checking `sizeOk`) keep their original behavior.
  return {
    previewKind: profile.previewKind,
    canPreview: profile.previewKind !== "generic",
    sizeOk: profile.sizeOk,
  };
}
