/**
 * features/files/hooks/useFileUpload.ts
 *
 * Thin ergonomic wrapper around the uploadFiles thunk. Handles picker UX +
 * returns uploaded file ids.
 */

"use client";

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { uploadFiles as uploadFilesThunk } from "../redux/thunks";
import type { UploadFilesArg } from "../types";

export interface UseFileUploadResult {
  upload: (
    files: File[],
    options?: Omit<UploadFilesArg, "files">,
  ) => Promise<{ uploaded: string[]; failed: string[] }>;
}

export function useFileUpload(
  defaults: Partial<Omit<UploadFilesArg, "files">> = {},
): UseFileUploadResult {
  const dispatch = useAppDispatch();

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
      return dispatch(uploadFilesThunk(arg)).unwrap();
    },
    [dispatch, defaults],
  );

  return { upload };
}
