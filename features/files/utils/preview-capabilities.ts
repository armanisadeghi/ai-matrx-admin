/**
 * features/files/utils/preview-capabilities.ts
 *
 * Decides which previewer (if any) should render a given file.
 */

import {
  isAudioMime,
  isImageMime,
  isPdfMime,
  isTextMime,
  isVideoMime,
  resolveMime,
} from "./mime";
import { getFileTypeDetails, type PreviewKind } from "./icon-map";

/** Max bytes we'll try to render inline. Bigger files go to a download path. */
export const MAX_INLINE_PREVIEW_BYTES = 10 * 1024 * 1024; // 10MB

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
  const mime = resolveMime(mimeType, fileName);
  const details = getFileTypeDetails(fileName);

  // Mime-first detection — authoritative for browser-playable content.
  let kind: PreviewKind = details.previewKind;
  if (isImageMime(mime)) kind = "image";
  else if (isVideoMime(mime)) kind = "video";
  else if (isAudioMime(mime)) kind = "audio";
  else if (isPdfMime(mime)) kind = "pdf";
  else if (isTextMime(mime) && kind === "generic") kind = "text";

  const canPreview =
    kind === "image" ||
    kind === "video" ||
    kind === "audio" ||
    kind === "pdf" ||
    kind === "code" ||
    kind === "text" ||
    kind === "markdown" ||
    kind === "data" ||
    kind === "spreadsheet";

  const sizeOk =
    kind === "image" ||
    kind === "video" ||
    kind === "audio" ||
    kind === "pdf" ||
    kind === "spreadsheet" ||
    fileSize == null ||
    fileSize <= MAX_INLINE_PREVIEW_BYTES;

  return { previewKind: kind, canPreview, sizeOk };
}
