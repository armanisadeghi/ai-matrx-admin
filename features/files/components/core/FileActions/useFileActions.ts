/**
 * features/files/components/core/FileActions/useFileActions.ts
 *
 * Headless action bundle — every action reads from Redux and dispatches the
 * right thunk. Buttons, menus, shortcuts call into this rather than touching
 * thunks directly.
 */

"use client";

import { useCallback, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  deleteFile as deleteFileThunk,
  getSignedUrl,
  moveFile as moveFileThunk,
  renameFile as renameFileThunk,
  restoreVersion as restoreVersionThunk,
  updateFileMetadata,
} from "@/features/files/redux/thunks";
import {
  deleteAny,
  moveAny,
  renameAny,
} from "@/features/files/redux/virtual-thunks";
import { selectFileById } from "@/features/files/redux/selectors";
import { isSyntheticId } from "@/features/files/virtual-sources/path";
import * as Files from "@/features/files/api/files";
import type { Visibility } from "@/features/files/types";

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
  const file = useAppSelector((s) => selectFileById(s, fileId));
  // Synthetic ids (`vfs:<adapter>:<vid>`) belong to virtual sources. Route
  // ops through the source-aware `*Any` thunks so each adapter's `write`,
  // `rename`, `move`, `delete` runs against the right Postgres column —
  // not the Python REST contract that only knows real cloud-files.
  const isVirtual = isSyntheticId(fileId) || file?.source.kind === "virtual";

  const rename = useCallback(
    async (newName: string) => {
      if (isVirtual) {
        await dispatch(renameAny({ id: fileId, newName })).unwrap();
        return;
      }
      await dispatch(renameFileThunk({ fileId, newName })).unwrap();
    },
    [dispatch, fileId, isVirtual],
  );

  const move = useCallback(
    async (newParentFolderId: string | null) => {
      if (isVirtual) {
        await dispatch(
          moveAny({ id: fileId, newParentId: newParentFolderId }),
        ).unwrap();
        return;
      }
      await dispatch(moveFileThunk({ fileId, newParentFolderId })).unwrap();
    },
    [dispatch, fileId, isVirtual],
  );

  const setVisibility = useCallback(
    async (visibility: Visibility) => {
      if (isVirtual) {
        // Visibility on virtual rows isn't uniformly supported across
        // adapters yet; the Notes/CodeFiles adapters track visibility
        // differently from real cloud-files. Surface as a no-op until each
        // adapter declares the capability.
        return;
      }
      await dispatch(
        updateFileMetadata({ fileId, patch: { visibility } }),
      ).unwrap();
    },
    [dispatch, fileId, isVirtual],
  );

  const updateMetadata = useCallback(
    async (metadata: Record<string, unknown>) => {
      if (isVirtual) return;
      await dispatch(
        updateFileMetadata({ fileId, patch: { metadata } }),
      ).unwrap();
    },
    [dispatch, fileId, isVirtual],
  );

  const deleteAction = useCallback(
    async (opts?: { hard?: boolean }) => {
      if (isVirtual) {
        await dispatch(deleteAny({ id: fileId, hard: opts?.hard ?? false })).unwrap();
        return;
      }
      await dispatch(
        deleteFileThunk({ fileId, hardDelete: opts?.hard ?? false }),
      ).unwrap();
    },
    [dispatch, fileId, isVirtual],
  );

  const restoreVersion = useCallback(
    async (versionNumber: number) => {
      if (isVirtual) {
        // Per-source version semantics live on the adapter; not routed yet.
        return;
      }
      await dispatch(restoreVersionThunk({ fileId, versionNumber })).unwrap();
    },
    [dispatch, fileId, isVirtual],
  );

  const download = useCallback(async () => {
    if (isVirtual) {
      // Virtual files don't have signed S3 URLs. Callers should hide the
      // download UI — the early return is belt-and-suspenders.
      return;
    }
    const { data } = await Files.getSignedUrl(fileId, {
      expiresIn: 120,
    });
    const a = document.createElement("a");
    a.href = data.url;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [fileId, isVirtual]);

  const copyShareUrl = useCallback(
    async (opts?: { expiresIn?: number }) => {
      if (isVirtual) return null;
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
    [dispatch, fileId, isVirtual],
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
