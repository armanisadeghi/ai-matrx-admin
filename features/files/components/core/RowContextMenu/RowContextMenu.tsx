/**
 * features/files/components/core/RowContextMenu/RowContextMenu.tsx
 *
 * Right-click context menus for file and folder rows. Wraps the row content
 * and renders a Radix ContextMenu — distinct from the dropdown shown by the
 * "..." button so we don't have to control the dropdown's open state.
 *
 * The intent is parity with desktop file managers: right-click anywhere on a
 * row to get the same actions as the More button. We render a focused subset
 * here (the most-used actions) to keep the menu fast and discoverable; the
 * full menu is still available via the "..." button.
 */

"use client";

import { useCallback, useState } from "react";
import {
  Copy,
  CopyPlus,
  Download,
  Edit2,
  Eye,
  FolderInput,
  FolderPlus,
  Trash2,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAllFilesMap,
  selectFolderById,
} from "@/features/files/redux/selectors";
import { setActiveFileId } from "@/features/files/redux/slice";
import {
  deleteFolder as deleteFolderThunk,
  moveFile as moveFileThunk,
  updateFolder as updateFolderThunk,
  uploadFiles as uploadFilesThunk,
} from "@/features/files/redux/thunks";
import { useFileActions } from "@/features/files/components/core/FileActions/useFileActions";
import { openFilePreview } from "@/features/files/components/preview/openFilePreview";
import { openFolderPicker } from "@/features/files/components/pickers/CloudFilesPickerHost";
import { requestRename } from "@/features/files/components/core/RenameDialog/RenameHost";
import { extractErrorMessage } from "@/utils/errors";

// ---------------------------------------------------------------------------
// File row context menu
// ---------------------------------------------------------------------------

export interface FileRowContextMenuProps {
  fileId: string;
  children: React.ReactNode;
}

export function FileRowContextMenu({ fileId, children }: FileRowContextMenuProps) {
  const dispatch = useAppDispatch();
  const filesById = useAppSelector(selectAllFilesMap);
  const file = filesById[fileId];
  const actions = useFileActions(fileId);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const cmd =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform)
      ? "⌘"
      : "Ctrl";

  const handlePreview = useCallback(() => {
    dispatch(setActiveFileId(fileId));
    openFilePreview(fileId);
  }, [dispatch, fileId]);

  const handleMove = useCallback(async () => {
    if (!file) return;
    const folderId = await openFolderPicker({ title: "Move to…" });
    if (folderId === undefined) return; // user dismissed
    if (folderId === file.parentFolderId) return;
    try {
      await dispatch(
        moveFileThunk({ fileId, newParentFolderId: folderId }),
      ).unwrap();
    } catch {
      /* error surfaces via slice state */
    }
  }, [dispatch, file, fileId]);

  const handleDuplicate = useCallback(async () => {
    if (!file) return;
    try {
      // Mirror the keyboard-shortcut duplicate flow — fetch + re-upload to
      // preserve mime type and parent.
      const url = await actions.copyShareUrl({ expiresIn: 600 });
      if (!url) return;
      const blob = await fetch(url).then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
      });
      const dot = file.fileName.lastIndexOf(".");
      const newName =
        dot > 0
          ? `${file.fileName.slice(0, dot)} (copy)${file.fileName.slice(dot)}`
          : `${file.fileName} (copy)`;
      const dup = new File([blob], newName, {
        type: file.mimeType ?? blob.type,
      });
      await dispatch(
        uploadFilesThunk({
          files: [dup],
          parentFolderId: file.parentFolderId,
          visibility: file.visibility,
        }),
      ).unwrap();
    } catch {
      /* swallow */
    }
  }, [actions, dispatch, file]);

  if (!file) {
    return <>{children}</>;
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={handlePreview}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </ContextMenuItem>
          <ContextMenuItem onClick={() => void actions.download()}>
            <Download className="mr-2 h-4 w-4" />
            Download
          </ContextMenuItem>
          <ContextMenuItem onClick={() => void actions.copyShareUrl()}>
            <Copy className="mr-2 h-4 w-4" />
            Copy link
            <ContextMenuShortcut>{cmd}L</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => requestRename("file", fileId)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Rename
            <ContextMenuShortcut>F2</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => void handleMove()}>
            <FolderInput className="mr-2 h-4 w-4" />
            Move…
          </ContextMenuItem>
          <ContextMenuItem onClick={() => void handleDuplicate()}>
            <CopyPlus className="mr-2 h-4 w-4" />
            Duplicate
            <ContextMenuShortcut>{cmd}D</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setConfirmDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
            <ContextMenuShortcut>⌫</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete file?</AlertDialogTitle>
            <AlertDialogDescription>
              This moves <strong>{file.fileName}</strong> to trash. You can
              restore it from versions for 30 days before bytes are removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void actions.delete({ hard: false });
                setConfirmDeleteOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// Folder row context menu
// ---------------------------------------------------------------------------

export interface FolderRowContextMenuProps {
  folderId: string;
  children: React.ReactNode;
  onNewFolderInside?: () => void;
}

export function FolderRowContextMenu({
  folderId,
  children,
  onNewFolderInside,
}: FolderRowContextMenuProps) {
  const dispatch = useAppDispatch();
  const folder = useAppSelector((s) => selectFolderById(s, folderId));
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await dispatch(deleteFolderThunk({ folderId })).unwrap();
      setConfirmDeleteOpen(false);
    } catch (err) {
      setDeleteError(extractErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }, [dispatch, folderId]);

  const handleMove = useCallback(async () => {
    if (!folder) return;
    const newParent = await openFolderPicker({
      title: "Move folder to…",
    });
    if (newParent === undefined) return;
    if (newParent === folder.parentId) return;
    try {
      await dispatch(
        updateFolderThunk({
          folderId,
          patch: { parentId: newParent },
        }),
      ).unwrap();
    } catch {
      /* slice surfaces error */
    }
  }, [dispatch, folder, folderId]);

  if (!folder) {
    return <>{children}</>;
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-56">
          <ContextMenuItem onClick={() => requestRename("folder", folderId)}>
            <Edit2 className="mr-2 h-4 w-4" />
            Rename
            <ContextMenuShortcut>F2</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => void handleMove()}>
            <FolderInput className="mr-2 h-4 w-4" />
            Move…
          </ContextMenuItem>
          {onNewFolderInside ? (
            <ContextMenuItem onClick={onNewFolderInside}>
              <FolderPlus className="mr-2 h-4 w-4" />
              New folder inside
            </ContextMenuItem>
          ) : null}
          <ContextMenuSeparator />
          <ContextMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setConfirmDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete folder
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog
        open={confirmDeleteOpen}
        onOpenChange={(open) => {
          setConfirmDeleteOpen(open);
          if (!open) setDeleteError(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              Move <strong>{folder.folderName}</strong> and all of its contents
              to Trash. You can restore it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? (
            <p className="text-xs text-destructive">{deleteError}</p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
