/**
 * features/files/components/surfaces/dropbox/BulkActionsBar.tsx
 *
 * Bottom-anchored toolbar that appears whenever one or more rows are
 * checkbox-selected in the file list. Mirrors Dropbox / Drive: a sticky strip
 * with a clear count, a few high-signal actions, and a way to dismiss the
 * selection without firing anything.
 *
 * Backend caveat: the Python backend doesn't expose bulk endpoints yet
 * (logged in PYTHON_TEAM_COMMS.md). We fan out per-file with a small
 * concurrency limit so we don't hammer the server. Folder deletion isn't
 * exposed as a bulk operation yet either, so this bar operates on file IDs
 * only — selected folders are skipped with a transient note.
 */

"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AlertCircle,
  Download,
  FolderInput,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
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
import {
  selectAllFilesMap,
  selectAllFoldersMap,
  selectSelection,
} from "@/features/files/redux/selectors";
import { clearSelection } from "@/features/files/redux/slice";
import {
  deleteFile as deleteFileThunk,
  getSignedUrl as getSignedUrlThunk,
  moveFile as moveFileThunk,
} from "@/features/files/redux/thunks";
import { openFolderPicker } from "@/features/files/components/pickers/CloudFilesPickerHost";

const MAX_PARALLEL = 4;

export function BulkActionsBar({ className }: { className?: string }) {
  const dispatch = useAppDispatch();
  const selection = useAppSelector(selectSelection);
  const filesById = useAppSelector(selectAllFilesMap);
  const foldersById = useAppSelector(selectAllFoldersMap);

  const [busyKind, setBusyKind] = useState<
    "download" | "move" | "delete" | null
  >(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [transientNote, setTransientNote] = useState<string | null>(null);

  // Split the selected ids into files vs folders. We only support bulk file
  // operations right now — folders fall back to per-row actions until the
  // backend gains bulk endpoints (PYTHON_TEAM_COMMS Phase 12).
  const { selectedFileIds, selectedFolderIds } = useMemo(() => {
    const fileIds: string[] = [];
    const folderIds: string[] = [];
    for (const id of selection.selectedIds) {
      if (filesById[id]) fileIds.push(id);
      else if (foldersById[id]) folderIds.push(id);
    }
    return { selectedFileIds: fileIds, selectedFolderIds: folderIds };
  }, [selection.selectedIds, filesById, foldersById]);

  const totalCount = selection.selectedIds.length;
  const hasFiles = selectedFileIds.length > 0;

  const showFolderNote = useCallback(
    (verb: string) => {
      if (selectedFolderIds.length === 0) return;
      const noun =
        selectedFolderIds.length === 1
          ? "1 folder was"
          : `${selectedFolderIds.length} folders were`;
      setTransientNote(
        `${noun} skipped — bulk ${verb} for folders is coming soon.`,
      );
      window.setTimeout(() => setTransientNote(null), 4500);
    },
    [selectedFolderIds.length],
  );

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleClear = useCallback(() => {
    dispatch(clearSelection());
  }, [dispatch]);

  const handleDownload = useCallback(async () => {
    if (!hasFiles || busyKind) return;
    setBusyKind("download");
    showFolderNote("download");
    try {
      // Fan-out to /files/{id}/url with bounded concurrency, then trigger a
      // hidden-anchor click for each. Browsers handle the queue. We avoid
      // window.open() which would be blocked as a popup.
      await runWithConcurrency(selectedFileIds, MAX_PARALLEL, async (id) => {
        const result = await dispatch(
          getSignedUrlThunk({ fileId: id, expiresIn: 3600 }),
        );
        const url =
          (result as { payload?: { url?: string } } | undefined)?.payload?.url;
        if (!url) return;
        const a = document.createElement("a");
        a.href = url;
        a.rel = "noopener noreferrer";
        a.download = filesById[id]?.fileName ?? "";
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
    } finally {
      setBusyKind(null);
    }
  }, [busyKind, dispatch, filesById, hasFiles, selectedFileIds, showFolderNote]);

  const handleMove = useCallback(async () => {
    if (!hasFiles || busyKind) return;
    const target = await openFolderPicker({
      title: `Move ${selectedFileIds.length} ${
        selectedFileIds.length === 1 ? "file" : "files"
      } to folder`,
      description: "Choose a destination folder.",
    });
    // openFolderPicker returns undefined if cancelled (null = root).
    if (target === undefined) return;
    setBusyKind("move");
    showFolderNote("move");
    try {
      await runWithConcurrency(selectedFileIds, MAX_PARALLEL, async (id) => {
        await dispatch(
          moveFileThunk({ fileId: id, newParentFolderId: target }),
        ).unwrap();
      });
      dispatch(clearSelection());
    } finally {
      setBusyKind(null);
    }
  }, [busyKind, dispatch, hasFiles, selectedFileIds, showFolderNote]);

  const handleDelete = useCallback(async () => {
    if (!hasFiles || busyKind) return;
    setConfirmDelete(false);
    setBusyKind("delete");
    showFolderNote("delete");
    try {
      await runWithConcurrency(selectedFileIds, MAX_PARALLEL, async (id) => {
        await dispatch(deleteFileThunk({ fileId: id })).unwrap();
      });
      dispatch(clearSelection());
    } finally {
      setBusyKind(null);
    }
  }, [busyKind, dispatch, hasFiles, selectedFileIds, showFolderNote]);

  // Hidden when nothing is selected. Mounting is conditional in the parent;
  // this guard is belt-and-suspenders.
  if (totalCount === 0) return null;

  return (
    <div
      className={cn(
        "pointer-events-auto fixed bottom-4 left-1/2 z-30 -translate-x-1/2 flex max-w-[min(95vw,52rem)] items-center gap-2 rounded-full border border-border bg-card/95 backdrop-blur px-2 py-1.5 shadow-lg",
        className,
      )}
      role="toolbar"
      aria-label="Bulk actions"
    >
      <span className="px-2 text-sm font-medium tabular-nums">
        {totalCount} selected
      </span>
      <span className="h-5 w-px bg-border" />

      <BulkActionButton
        icon={<Download className="h-3.5 w-3.5" />}
        label="Download"
        onClick={handleDownload}
        running={busyKind === "download"}
        disabled={!hasFiles || busyKind !== null}
      />
      <BulkActionButton
        icon={<FolderInput className="h-3.5 w-3.5" />}
        label="Move…"
        onClick={handleMove}
        running={busyKind === "move"}
        disabled={!hasFiles || busyKind !== null}
      />
      <BulkActionButton
        icon={<Trash2 className="h-3.5 w-3.5" />}
        label="Delete"
        onClick={() => setConfirmDelete(true)}
        running={busyKind === "delete"}
        disabled={!hasFiles || busyKind !== null}
        tone="destructive"
      />

      <span className="h-5 w-px bg-border" />
      <button
        type="button"
        onClick={handleClear}
        className="flex h-8 items-center gap-1 rounded-full px-3 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Clear selection"
      >
        <X className="h-3.5 w-3.5" />
        Cancel
      </button>

      {transientNote ? (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2 py-1 text-[11px] text-warning whitespace-nowrap">
          <AlertCircle className="h-3 w-3" />
          {transientNote}
        </div>
      ) : null}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedFileIds.length}{" "}
              {selectedFileIds.length === 1 ? "file" : "files"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {selectedFolderIds.length > 0 ? (
                <>
                  {selectedFolderIds.length}{" "}
                  {selectedFolderIds.length === 1 ? "folder" : "folders"} in
                  your selection will be skipped — folder bulk-delete isn't
                  available yet. Files will move to trash and can be restored
                  for 30 days.
                </>
              ) : (
                <>
                  These files will move to trash. You can restore them for 30
                  days before bytes are removed.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void handleDelete()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────

interface BulkActionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  running?: boolean;
  disabled?: boolean;
  tone?: "default" | "destructive";
}

function BulkActionButton({
  icon,
  label,
  onClick,
  running,
  disabled,
  tone = "default",
}: BulkActionButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        tone === "destructive"
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-accent",
      )}
    >
      {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : icon}
      {label}
    </button>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Runs `worker(item)` for each item with a bounded concurrency. Errors on a
 * single item are caught + logged so one failure doesn't abort the rest;
 * caller is expected to surface aggregate state via Redux.
 */
async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      try {
        await worker(items[i]);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[BulkActionsBar] item failed:", err);
      }
    }
  });
  await Promise.all(runners);
}
