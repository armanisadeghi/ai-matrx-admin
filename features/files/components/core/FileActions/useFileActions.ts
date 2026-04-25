/**
 * features/files/components/core/FileActions/useFileActions.ts
 *
 * Headless action bundle — every action reads from Redux and dispatches the
 * right thunk. Buttons, menus, shortcuts call into this rather than touching
 * thunks directly.
 */

"use client";

import { useCallback, useMemo } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import {
  deleteFile as deleteFileThunk,
  getSignedUrl,
  moveFile as moveFileThunk,
  renameFile as renameFileThunk,
  restoreVersion as restoreVersionThunk,
  updateFileMetadata,
} from "../../../redux/thunks";
import * as Files from "../../../api/files";
import type { Visibility } from "../../../types";

export interface FileActionHandlers {
  rename: (newName: string) => Promise<void>;
  move: (newParentFolderId: string | null) => Promise<void>;
  setVisibility: (visibility: Visibility) => Promise<void>;
  updateMetadata: (metadata: Record<string, unknown>) => Promise<void>;
  /**
   * Soft delete by default. Pass `{ hard: true }` to remove S3 bytes.
   */
  delete: (opts?: { hard?: boolean }) => Promise<void>;
  restoreVersion: (versionNumber: number) => Promise<void>;
  /**
   * Fetches a fresh signed URL and triggers a download via a transient anchor.
   * Doesn't write to state.
   */
  download: () => Promise<void>;
  /**
   * Copies a shareable signed URL to clipboard. Falls back to console.log if
   * the Clipboard API isn't available (non-secure contexts).
   */
  copyShareUrl: (opts?: { expiresIn?: number }) => Promise<string | null>;
}

export function useFileActions(fileId: string): FileActionHandlers {
  const dispatch = useAppDispatch();

  const rename = useCallback(
    async (newName: string) => {
      await dispatch(renameFileThunk({ fileId, newName })).unwrap();
    },
    [dispatch, fileId],
  );

  const move = useCallback(
    async (newParentFolderId: string | null) => {
      await dispatch(moveFileThunk({ fileId, newParentFolderId })).unwrap();
    },
    [dispatch, fileId],
  );

  const setVisibility = useCallback(
    async (visibility: Visibility) => {
      await dispatch(
        updateFileMetadata({ fileId, patch: { visibility } }),
      ).unwrap();
    },
    [dispatch, fileId],
  );

  const updateMetadata = useCallback(
    async (metadata: Record<string, unknown>) => {
      await dispatch(
        updateFileMetadata({ fileId, patch: { metadata } }),
      ).unwrap();
    },
    [dispatch, fileId],
  );

  const deleteAction = useCallback(
    async (opts?: { hard?: boolean }) => {
      await dispatch(
        deleteFileThunk({ fileId, hardDelete: opts?.hard ?? false }),
      ).unwrap();
    },
    [dispatch, fileId],
  );

  const restoreVersion = useCallback(
    async (versionNumber: number) => {
      await dispatch(restoreVersionThunk({ fileId, versionNumber })).unwrap();
    },
    [dispatch, fileId],
  );

  const download = useCallback(async () => {
    const { data } = await Files.getSignedUrl(fileId, {
      expiresIn: 120,
    });
    const a = document.createElement("a");
    a.href = data.url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [fileId]);

  const copyShareUrl = useCallback(
    async (opts?: { expiresIn?: number }) => {
      const result = await dispatch(
        getSignedUrl({ fileId, expiresIn: opts?.expiresIn ?? 3600 }),
      ).unwrap();
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(result.url);
          return result.url;
        } catch {
          /* fall through */
        }
      }
      return result.url;
    },
    [dispatch, fileId],
  );

  return useMemo(
    () => ({
      rename,
      move,
      setVisibility,
      updateMetadata,
      delete: deleteAction,
      restoreVersion,
      download,
      copyShareUrl,
    }),
    [
      rename,
      move,
      setVisibility,
      updateMetadata,
      deleteAction,
      restoreVersion,
      download,
      copyShareUrl,
    ],
  );
}
