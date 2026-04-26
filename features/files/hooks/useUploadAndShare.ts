/**
 * features/files/hooks/useUploadAndShare.ts
 *
 * Upload a file AND create a persistent, no-expiry share link in one call.
 * Returns both the `fileId` (canonical identity) and a `shareUrl` that's
 * safe to store in a DB column as a long-lived pointer.
 *
 * THIS IS THE PRIMITIVE FOR MIGRATING ANY CALLER THAT CURRENTLY PERSISTS
 * A `storage.getPublicUrl()` RESULT. Signed URLs expire; share links don't.
 *
 * Usage pattern (replaces the legacy "upload + store public URL" flow):
 *
 *   const { upload } = useUploadAndShare();
 *   const { fileId, shareUrl } = await upload({
 *     file,
 *     folderPath: "Images/Avatars",
 *     permissionLevel: "read",
 *   });
 *   await saveProfile({ avatarUrl: shareUrl, avatarFileId: fileId });
 *
 * Store BOTH the `fileId` and the `shareUrl` if the DB schema allows:
 *  - `shareUrl` renders directly in <img src>, survives DB migrations.
 *  - `fileId` is the stable reference for admin ops (rename, delete, rotate
 *    share link) and drives live updates via the cloudFiles slice.
 */

"use client";

import { useCallback } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import { cloudUpload, isCloudUploadFailure } from "@/features/files/upload";
import type {
  PermissionLevel,
  Visibility,
} from "@/features/files/types";

export interface UploadAndShareArgs {
  file: File;
  /** Exactly one of parentFolderId / folderPath. */
  parentFolderId?: string | null;
  folderPath?: string | null;
  /** Default "private" — the share link gates access, not the file's visibility. */
  visibility?: Visibility;
  /** Share link permission. Default "read". */
  permissionLevel?: "read" | "write";
  /** Optional max-use cap. Omit for unlimited. */
  maxUses?: number;
  /** Optional expiry. Omit for indefinite. */
  expiresAt?: string;
  metadata?: Record<string, unknown>;
  /**
   * Base origin for the share URL. Defaults to `window.location.origin`
   * when available. Override for SSR/worker contexts.
   */
  appOrigin?: string;
}

export interface UploadAndShareResult {
  fileId: string;
  shareToken: string;
  shareUrl: string;
  filePath: string;
}

export interface UseUploadAndShareResult {
  upload: (args: UploadAndShareArgs) => Promise<UploadAndShareResult>;
}

export function useUploadAndShare(): UseUploadAndShareResult {
  const dispatch = useAppDispatch();

  const upload = useCallback(
    async ({
      file,
      parentFolderId,
      folderPath,
      visibility = "private",
      permissionLevel = "read",
      maxUses,
      expiresAt,
      metadata,
      appOrigin,
    }: UploadAndShareArgs): Promise<UploadAndShareResult> => {
      // Single source of truth — `cloudUpload` calls the Python backend
      // directly. The backend creates any missing folders AND the share
      // link in one round-trip. No supabase-js direct queries → no RLS
      // recursion bug exposure.
      const result = await cloudUpload(
        file,
        {
          folderPath: folderPath?.trim().replace(/^\/+|\/+$/g, ""),
          parentFolderId: parentFolderId ?? null,
          visibility,
          metadata,
          createShareLink: true,
          shareLinkPermissionLevel: permissionLevel,
          shareLinkMaxUses: maxUses,
          shareLinkExpiresAt: expiresAt,
        },
        dispatch,
      );
      if (isCloudUploadFailure(result)) {
        throw new Error(result.error);
      }
      // `appOrigin` override is rare — `cloudUpload` already builds a URL
      // from window.location.origin. Honor an explicit override here for
      // SSR/worker callers that synthesize their own.
      const shareUrl =
        appOrigin && result.shareToken
          ? `${appOrigin.replace(/\/$/, "")}/share/${result.shareToken}`
          : result.shareUrl ?? "";
      return {
        fileId: result.fileId,
        shareToken: result.shareToken ?? "",
        shareUrl,
        filePath: result.filePath,
      };
    },
    [dispatch],
  );

  return { upload };
}

// ---------------------------------------------------------------------------
// Non-hook variant — for code that runs outside React (thunks, effects that
// can't call hooks). Requires the store singleton.
// ---------------------------------------------------------------------------

/**
 * Imperative `uploadAndShare` — callable from non-React contexts. Wraps
 * the same `cloudUpload` primitive as the hook; the only difference is
 * pulling the dispatch from the store singleton.
 */
export async function uploadAndShare(
  args: UploadAndShareArgs,
): Promise<UploadAndShareResult> {
  const { cloudUploadImperative, isCloudUploadFailure } = await import(
    "@/features/files/upload/cloudUpload"
  );
  const result = await cloudUploadImperative(args.file, {
    folderPath: args.folderPath?.trim().replace(/^\/+|\/+$/g, ""),
    parentFolderId: args.parentFolderId ?? null,
    visibility: args.visibility ?? "private",
    metadata: args.metadata,
    createShareLink: true,
    shareLinkPermissionLevel: args.permissionLevel ?? "read",
    shareLinkMaxUses: args.maxUses,
    shareLinkExpiresAt: args.expiresAt,
  });
  if (isCloudUploadFailure(result)) {
    throw new Error(result.error);
  }
  const shareUrl =
    args.appOrigin && result.shareToken
      ? `${args.appOrigin.replace(/\/$/, "")}/share/${result.shareToken}`
      : result.shareUrl ?? "";
  return {
    fileId: result.fileId,
    shareToken: result.shareToken ?? "",
    shareUrl,
    filePath: result.filePath,
  };
}
