/**
 * features/files/hooks/useFileUpload.ts
 *
 * Thin ergonomic wrapper around the upload pipeline. Routes through
 * the app-level `<UploadGuardHost/>` so every user-driven upload
 * gets the duplicate-detection pre-flight + resolution dialog.
 *
 * Returns the same shape it always has so existing consumers compile
 * unchanged. The new `cancelled` flag tells callers when the user
 * dismissed the duplicate dialog (no files uploaded).
 */

"use client";

import { useCallback } from "react";
import { requestUpload } from "@/features/files/upload/UploadGuardHost";
import type { UploadFilesArg } from "@/features/files/types";

export interface UseFileUploadResult {
  upload: (
    files: File[],
    options?: Omit<UploadFilesArg, "files">,
  ) => Promise<{
    uploaded: string[];
    /** Per-file failure with the real backend error, not just the filename. */
    failed: Array<{ name: string; error: string }>;
    /** True when the user dismissed the duplicate-upload dialog. */
    cancelled: boolean;
  }>;
}

export function useFileUpload(
  defaults: Partial<Omit<UploadFilesArg, "files">> = {},
): UseFileUploadResult {
  const upload = useCallback(
    async (
      files: File[],
      options: Omit<UploadFilesArg, "files"> = {} as Omit<UploadFilesArg, "files">,
    ) => {
      const arg: UploadFilesArg = {
        files,
        parentFolderId: options.parentFolderId ?? defaults.parentFolderId ?? null,
        visibility: options.visibility ?? defaults.visibility ?? "private",
        shareWith: options.shareWith ?? defaults.shareWith,
        shareLevel: options.shareLevel ?? defaults.shareLevel,
        changeSummary: options.changeSummary ?? defaults.changeSummary,
        metadata: options.metadata ?? defaults.metadata,
        concurrency: options.concurrency ?? defaults.concurrency,
      };
      return requestUpload(arg);
    },
    [defaults],
  );

  return { upload };
}
