/**
 * features/files/components/core/RenameDialog/RenameDialog.tsx
 *
 * Single rename dialog used for both files and folders. Pre-selects the name
 * (without extension for files) so the user can immediately type a replacement.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { extractErrorMessage } from "@/utils/errors";
import { useAppDispatch } from "@/lib/redux/hooks";
import {
  renameFile as renameFileThunk,
  updateFolder as updateFolderThunk,
} from "@/features/files/redux/thunks";

export type RenameKind = "file" | "folder";

export interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind: RenameKind;
  resourceId: string;
  currentName: string;
}

export function validateRenameInput(
  raw: string,
  currentName: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const value = raw.trim();
  if (!value) return { ok: false, error: "Name cannot be empty." };
  if (/[/\\]/.test(value))
    return { ok: false, error: "Name cannot contain '/' or '\\'." };
  if (value === currentName)
    return { ok: false, error: "New name is the same as the current name." };
  return { ok: true, value };
}

/**
 * Returns the index where the file extension starts (the dot), or the full
 * length when no extension is present. Used to pre-select just the basename.
 */
function basenameSelectionEnd(name: string, kind: RenameKind): number {
  if (kind === "folder") return name.length;
  const dot = name.lastIndexOf(".");
  return dot > 0 ? dot : name.length;
}

export function RenameDialog({
  open,
  onOpenChange,
  kind,
  resourceId,
  currentName,
}: RenameDialogProps) {
  const dispatch = useAppDispatch();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [value, setValue] = useState(currentName);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset internal state whenever the dialog opens for a (potentially) new
  // resource. We key off both `open` and the resource identity so reopening
  // for the same resource (e.g. after an error) still gets a fresh state.
  useEffect(() => {
    if (open) {
      setValue(currentName);
      setError(null);
      setBusy(false);
    }
  }, [open, resourceId, currentName]);

  const handleSubmit = useCallback(async () => {
    const result = validateRenameInput(value, currentName);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      if (kind === "file") {
        await dispatch(
          renameFileThunk({ fileId: resourceId, newName: result.value }),
        ).unwrap();
      } else {
        await dispatch(
          updateFolderThunk({
            folderId: resourceId,
            patch: { folderName: result.value },
          }),
        ).unwrap();
      }
      onOpenChange(false);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [dispatch, kind, resourceId, value, currentName, onOpenChange]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          const el = inputRef.current;
          if (!el) return;
          el.focus();
          el.setSelectionRange(0, basenameSelectionEnd(currentName, kind));
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            Rename {kind === "file" ? "file" : "folder"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            Enter a new name. {kind === "file"
              ? "Keep the extension to preserve the file type."
              : "Children move with the folder."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={currentName}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          style={{ fontSize: "16px" }}
          disabled={busy}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleSubmit();
            }
          }}
        />
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy} onClick={() => setError(null)}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleSubmit();
            }}
            disabled={busy}
          >
            {busy ? "Renaming…" : "Rename"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
