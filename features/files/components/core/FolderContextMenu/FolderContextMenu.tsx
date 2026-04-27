/**
 * features/files/components/core/FolderContextMenu/FolderContextMenu.tsx
 *
 * Right-click / three-dot menu for a folder. Headless: parent supplies the
 * trigger via `children`; this component renders the dropdown items.
 *
 * Mirror of FileContextMenu. Folder ops are limited compared to files for v1
 * (Rename, Move, New folder inside, Delete). Visibility / share / permissions
 * can be added later — they share the same backend wiring as files.
 */

"use client";

import { useCallback, useState } from "react";
import {
  Edit2,
  FolderInput,
  FolderPlus,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { selectFolderById } from "@/features/files/redux/selectors";
import { deleteFolder as deleteFolderThunk } from "@/features/files/redux/thunks";
import { extractErrorMessage } from "@/utils/errors";
import { RenameDialog } from "@/features/files/components/core/RenameDialog/RenameDialog";

export interface FolderContextMenuProps {
  folderId: string;
  children: React.ReactNode;
  onRename?: () => void;
  onMove?: () => void;
  onNewFolderInside?: () => void;
  disabled?: boolean;
}

export function FolderContextMenu({
  folderId,
  children,
  onRename,
  onMove,
  onNewFolderInside,
  disabled,
}: FolderContextMenuProps) {
  const dispatch = useAppDispatch();
  const folder = useAppSelector((state) => selectFolderById(state, folderId));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Default rename handler opens the built-in dialog. Hosts can override.
  const handleRename = onRename ?? (() => setRenameOpen(true));

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await dispatch(deleteFolderThunk({ folderId })).unwrap();
      setConfirmOpen(false);
    } catch (err) {
      setDeleteError(extractErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  }, [dispatch, folderId]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild disabled={disabled}>
          {children}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem onClick={handleRename}>
            <Edit2 className="mr-2 h-4 w-4" />
            Rename
            <DropdownMenuShortcut>F2</DropdownMenuShortcut>
          </DropdownMenuItem>
          {onMove ? (
            <DropdownMenuItem onClick={onMove}>
              <FolderInput className="mr-2 h-4 w-4" />
              Move…
            </DropdownMenuItem>
          ) : null}
          {onNewFolderInside ? (
            <DropdownMenuItem onClick={onNewFolderInside}>
              <FolderPlus className="mr-2 h-4 w-4" />
              New folder inside
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete folder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open) setDeleteError(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete folder?</AlertDialogTitle>
            <AlertDialogDescription>
              {folder ? (
                <>
                  Move <strong>{folder.folderName}</strong> and all of its
                  contents to Trash. You can restore it later.
                </>
              ) : (
                "Move this folder and all of its contents to Trash."
              )}
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

      {folder && !onRename ? (
        <RenameDialog
          open={renameOpen}
          onOpenChange={setRenameOpen}
          kind="folder"
          resourceId={folderId}
          currentName={folder.folderName}
        />
      ) : null}
    </>
  );
}
