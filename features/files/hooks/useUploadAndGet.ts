/**
 * features/files/hooks/useUploadAndGet.ts
 *
 * The ergonomic "give me a fileId for this File" primitive. Wraps the upload
 * thunk with folder auto-creation so consumers can say "save this here" in
 * one call, using either:
 *   - a `parentFolderId` (exact folder), or
 *   - a `folderPath` (auto-ensured — "Images/2026" will create the chain if missing).
 *
 * This is THE recommended hook for replacing legacy `supabase.storage.upload`
 * calls in existing features (images, chat, tasks, etc.). The return shape is
 * a single `{ fileId, filePath, url }` trio — no bucket concept.
 */

"use client";

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { cloudUpload, isCloudUploadFailure } from "@/features/files/upload";
import type {
  PermissionLevel,
  Visibility,
} from "@/features/files/types";

export interface UploadAndGetArgs {
  file: File;
  /**
   * Target folder — exactly one of:
   *   - `parentFolderId`: existing folder id (null = root).
   *   - `folderPath`:     logical path like "Images/2026/Q1". Missing segments
   *                       are created via `ensureFolderPath`.
   *                       Leading / trailing slashes are stripped.
   */
  parentFolderId?: string | null;
  folderPath?: string | null;
  visibility?: Visibility;
  shareWith?: string[];
  shareLevel?: PermissionLevel;
  metadata?: Record<string, unknown>;
  changeSummary?: string;
}

export interface UploadAndGetResult {
  fileId: string;
}

export interface UseUploadAndGetResult {
  /**
   * Uploads one file and resolves with its fileId. Rejects if the upload
   * fails — callers typically wrap this with a try/catch + toast.
   */
  upload: (args: UploadAndGetArgs) => Promise<UploadAndGetResult>;
}

export function useUploadAndGet(): UseUploadAndGetResult {
  const dispatch = useAppDispatch();

  const upload = useCallback(
    async ({
      file,
      parentFolderId,
      folderPath,
      visibility = "private",
      shareWith,
      shareLevel,
      metadata,
      changeSummary,
    }: UploadAndGetArgs): Promise<UploadAndGetResult> => {
      // Single source of truth — `cloudUpload` posts to the Python backend
      // which auto-creates any missing folders. We deliberately don't call
      // `ensureFolderPath` here because that would query
      // `supabase.from("cld_folders")` directly from the browser, which
      // hits the well-known RLS recursion bug on `cld_file_permissions`.
      const result = await cloudUpload(
        file,
        {
          folderPath: folderPath?.trim().replace(/^\/+|\/+$/g, ""),
          parentFolderId: parentFolderId ?? null,
          visibility,
          shareWith,
          shareLevel,
          metadata,
          changeSummary,
        },
        dispatch,
      );
      if (isCloudUploadFailure(result)) {
        throw new Error(result.error);
      }
      return { fileId: result.fileId };
    },
    [dispatch],
  );

  return { upload };
}
