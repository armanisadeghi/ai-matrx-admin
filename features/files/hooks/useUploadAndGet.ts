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
import { ensureFolderPath, uploadFiles } from "../redux/thunks";
import type {
  PermissionLevel,
  Visibility,
} from "../types";

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
      let resolvedParent: string | null = parentFolderId ?? null;

      if (folderPath && folderPath.trim()) {
        // Auto-create the chain and land at the leaf.
        resolvedParent = await dispatch(
          ensureFolderPath({
            folderPath: folderPath.trim().replace(/^\/+|\/+$/g, ""),
            visibility,
          }),
        ).unwrap();
      }

      const { uploaded, failed } = await dispatch(
        uploadFiles({
          files: [file],
          parentFolderId: resolvedParent,
          visibility,
          shareWith,
          shareLevel,
          metadata,
          changeSummary,
          concurrency: 1,
        }),
      ).unwrap();

      if (failed.length > 0 || uploaded.length === 0) {
        throw new Error(
          failed.length
            ? `Upload failed: ${failed.join(", ")}`
            : "Upload failed: unknown error",
        );
      }

      return { fileId: uploaded[0] };
    },
    [dispatch],
  );

  return { upload };
}
