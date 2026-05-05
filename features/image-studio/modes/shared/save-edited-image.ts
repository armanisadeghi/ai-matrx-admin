"use client";

import { uploadAndShare } from "@/features/files/hooks/useUploadAndShare";
import type { SaveResult } from "./types";

/**
 * Persist an edited image (Blob from canvas / Filerobot / marker.js export)
 * to the cloud library and return the new file id + persistent share URL.
 *
 * Single primitive used by all three new modes. The mode supplies a Blob
 * (typically a PNG/JPEG it just rendered) and a desired filename — this
 * wraps the blob as a File and pushes it through the standard cloud-files
 * upload pipeline. Folder hierarchy is created server-side.
 */
export async function saveEditedImage(args: {
  blob: Blob;
  filename: string;
  folderPath: string;
  mime?: string;
  metadata?: Record<string, unknown>;
}): Promise<SaveResult> {
  const file = new File([args.blob], args.filename, {
    type: args.mime ?? args.blob.type ?? "image/png",
  });
  const result = await uploadAndShare({
    file,
    folderPath: args.folderPath,
    permissionLevel: "read",
    metadata: args.metadata,
  });
  return {
    fileId: result.fileId,
    shareUrl: result.shareUrl,
    filename: file.name,
  };
}
