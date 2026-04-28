/**
 * features/files/components/surfaces/useFileShortcuts.ts
 *
 * Global keyboard shortcuts for the cloud-files page. Mounts a single
 * `keydown` listener on the window with strict focus-scoping so the
 * handlers don't fire when the user is typing in inputs / dialogs / the
 * preview / context-menus.
 *
 * Shortcuts (matched on activeFileId):
 *   ⌘L / Ctrl+L  → Copy share link
 *   ⌘D / Ctrl+D  → Duplicate (client-side fetch + re-upload)
 *   ⌫ / Delete   → Soft-delete (with confirm)
 *
 * Shortcuts that operate on the multi-selection (regardless of activeFileId):
 *   ⌫ / Delete   → Batch soft-delete the selection
 *
 * The handlers MUST be conservative: this hook lives at PageShell level,
 * so any false positive interrupts user typing in the search box, file
 * preview text, dialogs, etc. We refuse to fire when:
 *   • An input/textarea/contentEditable is focused
 *   • A dialog/alertdialog is open (Radix sets `aria-hidden` on
 *     background; we check `document.querySelector('[role="dialog"]')`)
 *   • The user is mid-IME composition (`event.isComposing`)
 *
 * Browser shortcuts we deliberately preserve:
 *   ⌘D in some browsers = bookmark; we `preventDefault()` only AFTER
 *   confirming we own the file context, so the bookmark is suppressed
 *   only when our handler runs.
 */

"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectActiveFileId,
  selectActiveFolderId,
  selectAllFilesMap,
  selectAllFoldersMap,
  selectChildrenOfFolder,
  selectSelection,
} from "../../redux/selectors";
import {
  clearSelection,
  setActiveFileId,
  setSelection,
} from "../../redux/slice";
import {
  deleteFile as deleteFileThunk,
  getSignedUrl as getSignedUrlThunk,
  uploadFiles as uploadFilesThunk,
} from "../../redux/thunks";
import { deleteAny } from "../../redux/virtual-thunks";
import { requestRename } from "../core/RenameDialog/RenameHost";

interface PendingDelete {
  kind: "single" | "batch";
  ids: string[];
}

/**
 * Returns a confirm-delete state + a clearer. The PageShell renders an
 * AlertDialog wired to this state so destructive shortcuts don't run
 * silently.
 */
export function useFileShortcuts(): {
  pendingDelete: PendingDelete | null;
  clearPendingDelete: () => void;
  confirmDelete: () => Promise<void>;
} {
  const dispatch = useAppDispatch();
  const activeFileId = useAppSelector(selectActiveFileId);
  const activeFolderId = useAppSelector(selectActiveFolderId);
  const selection = useAppSelector(selectSelection);
  const filesById = useAppSelector(selectAllFilesMap);
  const foldersById = useAppSelector(selectAllFoldersMap);
  const activeFolderChildren = useAppSelector((state) =>
    selectChildrenOfFolder(state, activeFolderId ?? ""),
  );

  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // IME composition — never intercept.
      if (e.isComposing) return;

      // Input focus — never intercept (typing in search, dialogs, etc).
      const target = (e.target as HTMLElement | null) ?? null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (target.isContentEditable) return;
      }

      // Open dialog / alert — never intercept (Radix mounts as portal at
      // body level; the trigger of our shortcuts shouldn't undermine an
      // open confirm dialog).
      if (
        typeof document !== "undefined" &&
        document.querySelector('[role="dialog"], [role="alertdialog"]')
      ) {
        return;
      }

      const isMac = /Mac|iPhone|iPad/i.test(navigator.platform);
      const cmdKey = isMac ? e.metaKey : e.ctrlKey;
      const onlyCmd = cmdKey && !e.altKey && !e.shiftKey;

      // ⌘L / Ctrl+L — copy share link for the active file.
      if (onlyCmd && e.key.toLowerCase() === "l") {
        if (!activeFileId) return;
        // Virtual files don't have signed S3 URLs to copy. Skip silently
        // rather than showing an error — the action menu hides the button
        // for virtual files for the same reason.
        if (filesById[activeFileId]?.source.kind === "virtual") return;
        e.preventDefault();
        void (async () => {
          try {
            const result = await dispatch(
              getSignedUrlThunk({ fileId: activeFileId, expiresIn: 3600 }),
            );
            const url =
              (result as { payload?: { url?: string } } | undefined)?.payload
                ?.url;
            if (url && navigator.clipboard) {
              await navigator.clipboard.writeText(url);
            }
          } catch {
            /* swallow — user can fall back to the menu */
          }
        })();
        return;
      }

      // ⌘D / Ctrl+D — duplicate the active file (client-side fan-out).
      if (onlyCmd && e.key.toLowerCase() === "d") {
        if (!activeFileId) return;
        const file = filesById[activeFileId];
        if (!file) return;
        // Duplicate fetches the current bytes via signed URL — only works
        // for real cloud-files. Skip for virtual rows.
        if (file.source.kind === "virtual") return;
        e.preventDefault();
        void (async () => {
          try {
            const result = await dispatch(
              getSignedUrlThunk({ fileId: activeFileId, expiresIn: 600 }),
            );
            const url =
              (result as { payload?: { url?: string } } | undefined)?.payload
                ?.url;
            if (!url) return;
            const blob = await fetch(url).then((r) => {
              if (!r.ok) throw new Error(`HTTP ${r.status}`);
              return r.blob();
            });
            const base = file.fileName;
            const dot = base.lastIndexOf(".");
            const newName =
              dot > 0
                ? `${base.slice(0, dot)} (copy)${base.slice(dot)}`
                : `${base} (copy)`;
            const dupFile = new File([blob], newName, {
              type: file.mimeType ?? blob.type,
            });
            await dispatch(
              uploadFilesThunk({
                files: [dupFile],
                parentFolderId: file.parentFolderId,
                visibility: file.visibility,
              }),
            ).unwrap();
          } catch {
            /* swallow — user can retry via the menu */
          }
        })();
        return;
      }

      // ⌘A / Ctrl+A — select every visible file + folder under the active
      // folder. Skipped on subroutes (Trash, Shared, etc.) where activeFolderId
      // isn't set; the user can still ⌘A inside an explicit list later if we
      // expose more entry points.
      if (onlyCmd && e.key.toLowerCase() === "a") {
        const ids = [
          ...activeFolderChildren.folderIds,
          ...activeFolderChildren.fileIds,
        ];
        if (ids.length === 0) return;
        e.preventDefault();
        dispatch(setSelection({ selectedIds: ids, anchorId: ids[0] ?? null }));
        return;
      }

      // F2 — rename. Targets, in priority order:
      //   1. Single-selection file or folder
      //   2. Active file (preview is open)
      //   3. Active folder
      if (e.key === "F2" && !cmdKey && !e.altKey && !e.shiftKey) {
        const sel = selection.selectedIds;
        if (sel.length === 1) {
          const id = sel[0];
          if (filesById[id]) {
            e.preventDefault();
            requestRename("file", id);
            return;
          }
          if (foldersById[id]) {
            e.preventDefault();
            requestRename("folder", id);
            return;
          }
        }
        if (activeFileId && filesById[activeFileId]) {
          e.preventDefault();
          requestRename("file", activeFileId);
          return;
        }
        if (activeFolderId && foldersById[activeFolderId]) {
          e.preventDefault();
          requestRename("folder", activeFolderId);
          return;
        }
      }

      // Delete / Backspace — soft-delete. Prefer batch over single when a
      // multi-selection exists.
      if (e.key === "Delete" || e.key === "Backspace") {
        const selectedFileIds = selection.selectedIds.filter(
          (id) => filesById[id],
        );
        if (selectedFileIds.length > 1) {
          e.preventDefault();
          setPendingDelete({ kind: "batch", ids: selectedFileIds });
          return;
        }
        if (activeFileId && filesById[activeFileId]) {
          e.preventDefault();
          setPendingDelete({ kind: "single", ids: [activeFileId] });
          return;
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    activeFileId,
    activeFolderId,
    activeFolderChildren,
    dispatch,
    filesById,
    foldersById,
    selection.selectedIds,
  ]);

  const clearPendingDelete = () => setPendingDelete(null);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const ids = [...pendingDelete.ids];
    setPendingDelete(null);
    // Use the source-aware deleteAny so virtual files route through their
    // adapter's `delete()` (the unified /v1 thunk picks the right path
    // based on synthetic-id detection).
    const deleteForId = (id: string) =>
      filesById[id]?.source.kind === "virtual"
        ? dispatch(deleteAny({ id }))
        : dispatch(deleteFileThunk({ fileId: id }));
    if (pendingDelete.kind === "single") {
      try {
        await deleteForId(ids[0]).unwrap();
        // If the deleted file was the previewed one, dismiss the pane.
        if (ids[0] === activeFileId) dispatch(setActiveFileId(null));
      } catch {
        /* nothing to do — slice surfaces error state */
      }
      return;
    }
    // Batch — concurrency 4
    let cursor = 0;
    const runners = Array.from({ length: Math.min(4, ids.length) }, async () => {
      while (cursor < ids.length) {
        const i = cursor++;
        try {
          await deleteForId(ids[i]).unwrap();
        } catch {
          /* per-item failure tolerable */
        }
      }
    });
    await Promise.all(runners);
    dispatch(clearSelection());
  };

  return { pendingDelete, clearPendingDelete, confirmDelete };
}
