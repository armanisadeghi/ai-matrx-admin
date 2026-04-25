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
import { createShareLink, ensureFolderPath, uploadFiles } from "@/features/files/redux/thunks";
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
      let resolvedParent: string | null = parentFolderId ?? null;

      if (folderPath && folderPath.trim()) {
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
          metadata,
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

      const fileId = uploaded[0];

      const link = await dispatch(
        createShareLink({
          resourceId: fileId,
          resourceType: "file",
          permissionLevel,
          maxUses,
          expiresAt,
        }),
      ).unwrap();

      const origin =
        appOrigin ??
        (typeof window !== "undefined" ? window.location.origin : "");
      const shareUrl = `${origin.replace(/\/$/, "")}/share/${link.shareToken}`;

      // The upload response's file_path is the logical path; echo it so
      // callers that previously relied on it (rare) can keep a breadcrumb.
      return {
        fileId,
        shareToken: link.shareToken,
        shareUrl,
        filePath: link.resourceId, // best effort — exact path isn't in state yet
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
 * Imperative `uploadAndShare` — callable from non-React contexts. Requires
 * the redux store to be initialized.
 */
export async function uploadAndShare(
  args: UploadAndShareArgs,
): Promise<UploadAndShareResult> {
  const { getStore } = await import("@/lib/redux/store");
  const store = getStore();
  if (!store) throw new Error("Redux store not ready");

  let resolvedParent: string | null = args.parentFolderId ?? null;

  if (args.folderPath && args.folderPath.trim()) {
    resolvedParent = await store
      .dispatch(
        ensureFolderPath({
          folderPath: args.folderPath.trim().replace(/^\/+|\/+$/g, ""),
          visibility: args.visibility ?? "private",
        }),
      )
      .unwrap();
  }

  const { uploaded, failed } = await store
    .dispatch(
      uploadFiles({
        files: [args.file],
        parentFolderId: resolvedParent,
        visibility: args.visibility ?? "private",
        metadata: args.metadata,
        concurrency: 1,
      }),
    )
    .unwrap();

  if (failed.length > 0 || uploaded.length === 0) {
    throw new Error(
      failed.length
        ? `Upload failed: ${failed.join(", ")}`
        : "Upload failed: unknown error",
    );
  }

  const fileId = uploaded[0];

  const link = await store
    .dispatch(
      createShareLink({
        resourceId: fileId,
        resourceType: "file",
        permissionLevel: args.permissionLevel ?? "read",
        maxUses: args.maxUses,
        expiresAt: args.expiresAt,
      }),
    )
    .unwrap();

  const origin =
    args.appOrigin ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const shareUrl = `${origin.replace(/\/$/, "")}/share/${link.shareToken}`;

  return {
    fileId,
    shareToken: link.shareToken,
    shareUrl,
    filePath: link.resourceId,
  };
}
