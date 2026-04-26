/**
 * useFileUploadWithStorage — LEGACY COMPAT WRAPPER
 *
 * The original hook wrote to Supabase Storage via `FileSystemManager` and a
 * `(bucket, path)` pair. Phase 9 migrated the internals to the new
 * cloud-files system (features/files/*) while preserving the exact public
 * surface so the ~14 feature consumers keep working without edits.
 *
 * How it maps:
 *   - `bucket` → a top-level cloud-files folder name (see mapLegacyBucket).
 *   - `path`   → appended as a subfolder path.
 *   - Upload  → cloud-files `uploadFiles` thunk + `createShareLink` with no
 *     expiry. The returned `url` is the SHARE URL (stable, persistable).
 *   - `metadata` → synthesized from File properties. `localId` → fileId.
 *   - User-assets methods (`uploadToPublicUserAssets`, `uploadToPrivateUserAssets`)
 *     route to dedicated top-level folders.
 *
 * Scheduled for deletion in Phase 11 once callers migrate to
 * `useUploadAndShare` / `useUploadAndGet` from `@/features/files/hooks`.
 */

import { useCallback, useMemo, useState } from "react";
import { extractErrorMessage } from "@/utils/errors";
import {
  getFileDetailsByUrl,
  type EnhancedFileDetails,
} from "@/utils/file-operations/constants";
import type { StorageMetadata } from "@/utils/file-operations/types";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { CloudFolders } from "@/features/files/utils/folder-conventions";
import { ensureFolderPath } from "@/features/files/redux/thunks";
import {
  createShareLink,
  uploadFiles as cloudUploadFiles,
} from "@/features/files/redux/thunks";

// ---------------------------------------------------------------------------
// Bucket → folder mapping
// ---------------------------------------------------------------------------

function mapLegacyBucket(bucket: string): string {
  switch (bucket) {
    case "user-public-assets":
      return "Shared Assets";
    case "user-private-assets":
      return "Private Assets";
    case "images":
    case "Images":
      return CloudFolders.IMAGES;
    case "audio":
    case "Audio":
      return CloudFolders.AUDIO;
    case "audio-recordings":
      return CloudFolders.AUDIO_RECORDINGS;
    case "documents":
    case "Documents":
      return CloudFolders.DOCUMENTS;
    case "code":
    case "Code":
      return CloudFolders.CODE;
    case "userContent":
      return "My Files";
    case "any-file":
      return "Uploads";
    case "attachments":
      return CloudFolders.CHAT_ATTACHMENTS;
    default:
      // Pass through unknown bucket names as folder names.
      return bucket;
  }
}

function composeFolderPath(bucket: string, path?: string): string {
  const top = mapLegacyBucket(bucket).replace(/^\/+|\/+$/g, "");
  const sub = (path ?? "").replace(/^\/+|\/+$/g, "");
  return sub ? `${top}/${sub}` : top;
}

// ---------------------------------------------------------------------------
// Result shape (matches legacy)
// ---------------------------------------------------------------------------

interface UploadResult {
  url: string;
  type: string;
  details: EnhancedFileDetails;
  metadata?: StorageMetadata;
  localId?: string;
}

function classifyFileType(mimeType: string): string {
  if (!mimeType) return "unknown";
  const type = mimeType.toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("text/") || type === "application/json") return "text";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("audio/")) return "audio";
  if (type === "application/pdf") return "pdf";
  return "other";
}

function synthesizeMetadata(file: File): StorageMetadata {
  // StorageMetadata is a legacy shape. We fill in what we have from the File
  // and leave the rest as empty strings / reasonable defaults — downstream
  // callers read `size` and `mimetype` almost exclusively.
  return {
    eTag: "",
    size: file.size,
    mimetype: file.type || "application/octet-stream",
    cacheControl: "max-age=3600",
    lastModified: new Date(file.lastModified).toISOString(),
    contentLength: file.size,
  } as StorageMetadata;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useFileUploadWithStorage = (bucket: string, path?: string) => {
  const dispatch = useAppDispatch();
  const userId = useAppSelector(selectUserId);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Core primitive — upload one file to a given folder path, return the
  // legacy-shaped UploadResult with a persistent share URL.
  // -------------------------------------------------------------------------

  const uploadOneTo = useCallback(
    async (folderPath: string, file: File): Promise<UploadResult | null> => {
      try {
        setIsLoading(true);
        setError(null);

        const parentFolderId = await dispatch(
          ensureFolderPath({
            folderPath,
            visibility: "private",
          }),
        ).unwrap();

        const { uploaded, failed } = await dispatch(
          cloudUploadFiles({
            files: [file],
            parentFolderId,
            visibility: "private",
            concurrency: 1,
            metadata: {
              origin: "legacy-compat:useFileUploadWithStorage",
              legacy_bucket: bucket,
            },
          }),
        ).unwrap();

        if (failed.length > 0 || uploaded.length === 0) {
          throw new Error(failed[0] ?? "Upload failed");
        }

        const fileId = uploaded[0];
        const link = await dispatch(
          createShareLink({
            resourceId: fileId,
            resourceType: "file",
            permissionLevel: "read",
          }),
        ).unwrap();

        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const shareUrl = `${origin.replace(/\/$/, "")}/share/${link.shareToken}`;

        const metadata = synthesizeMetadata(file);
        const details = getFileDetailsByUrl(shareUrl, metadata, fileId);

        const result: UploadResult = {
          url: shareUrl,
          type: classifyFileType(file.type),
          details,
          metadata,
          // Re-use the cloud-files UUID as the localId so callers that
          // stored this id can still reason about the file.
          localId: fileId,
        };
        setResults((prev) => [...prev, result]);
        return result;
      } catch (err) {
        const message = extractErrorMessage(err);
        setError(message || "Upload failed");
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, bucket],
  );

  const uploadMultipleTo = useCallback(
    async (folderPath: string, files: File[]): Promise<UploadResult[]> => {
      const out: UploadResult[] = [];
      for (const file of files) {
        const r = await uploadOneTo(folderPath, file);
        if (r) out.push(r);
      }
      return out;
    },
    [uploadOneTo],
  );

  // -------------------------------------------------------------------------
  // Public API — mirrors the legacy signatures exactly.
  // -------------------------------------------------------------------------

  const defaultFolder = useMemo(
    () => composeFolderPath(bucket, path),
    [bucket, path],
  );

  const uploadFile = useCallback(
    (file: File) => uploadOneTo(defaultFolder, file),
    [uploadOneTo, defaultFolder],
  );

  const uploadFiles = useCallback(
    async (files: File[]): Promise<UploadResult[]> => {
      const res = await uploadMultipleTo(defaultFolder, files);
      setResults(res);
      return res;
    },
    [uploadMultipleTo, defaultFolder],
  );

  const getLocalFile = useCallback(async (_localId: string) => {
    // Legacy concept — the new system doesn't maintain a separate local-file
    // store. Callers using this rarely depend on it strictly; return null
    // and let them fall back to the remote URL.
    return null;
  }, []);

  const createUserDirectories = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      if (!userId) throw new Error("User ID is not available");
      await dispatch(
        ensureFolderPath({
          folderPath: "Shared Assets",
          visibility: "private",
        }),
      ).unwrap();
      await dispatch(
        ensureFolderPath({
          folderPath: "Private Assets",
          visibility: "private",
        }),
      ).unwrap();
      return true;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create user directories",
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, userId]);

  const uploadToPublicUserAssets = useCallback(
    (file: File) => uploadOneTo("Shared Assets", file),
    [uploadOneTo],
  );

  const uploadMultipleToPublicUserAssets = useCallback(
    async (files: File[]) => {
      const res = await uploadMultipleTo("Shared Assets", files);
      setResults(res);
      return res;
    },
    [uploadMultipleTo],
  );

  const uploadToPrivateUserAssets = useCallback(
    (file: File) => uploadOneTo("Private Assets", file),
    [uploadOneTo],
  );

  const uploadMultipleToPrivateUserAssets = useCallback(
    async (files: File[]) => {
      const res = await uploadMultipleTo("Private Assets", files);
      setResults(res);
      return res;
    },
    [uploadMultipleTo],
  );

  return {
    uploadFile,
    uploadFiles,
    getLocalFile,
    createUserDirectories,
    uploadToPublicUserAssets,
    uploadMultipleToPublicUserAssets,
    uploadToPrivateUserAssets,
    uploadMultipleToPrivateUserAssets,
    results,
    isLoading,
    error,
  };
};
