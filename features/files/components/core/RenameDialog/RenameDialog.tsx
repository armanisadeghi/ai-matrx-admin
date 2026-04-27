/**
 * features/files/components/core/RenameDialog/RenameDialog.tsx
 *
 * Single rename dialog used for both files and folders. Pre-selects the name
 * (without extension for files) so the user can immediately type a replacement.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";
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
 * Splits a filename into [basename, extension]. Extension includes the dot.
 * Files with no extension return ["whole-name", ""].
 * Hidden files like ".env" are treated as basename-only (no extension).
 */
export function splitNameAndExtension(name: string): [string, string] {
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return [name, ""];
  return [name.slice(0, dot), name.slice(dot)];
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
  const extInputRef = useRef<HTMLInputElement | null>(null);
  const [originalBase, originalExt] = useMemo(
    () => (kind === "file" ? splitNameAndExtension(currentName) : [currentName, ""]),
    [kind, currentName],
  );
  const [base, setBase] = useState(originalBase);
  const [ext, setExt] = useState(originalExt);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset internal state whenever the dialog opens for a (potentially) new
  // resource. We key off both `open` and the resource identity so reopening
  // for the same resource (e.g. after an error) still gets a fresh state.
  useEffect(() => {
    if (open) {
      setBase(originalBase);
      setExt(originalExt);
      setError(null);
      setBusy(false);
    }
  }, [open, resourceId, originalBase, originalExt]);

  const composedName = kind === "file" ? `${base}${ext}` : base;
  const extChanged = kind === "file" && ext !== originalExt;

  const handleSubmit = useCallback(async () => {
    const result = validateRenameInput(composedName, currentName);
    if (result.ok === false) {
      setError(result.error);
      return;
    }
    const nextName = result.value;
    setBusy(true);
    setError(null);
    try {
      if (kind === "file") {
        await dispatch(
          renameFileThunk({ fileId: resourceId, newName: nextName }),
        ).unwrap();
      } else {
        await dispatch(
          updateFolderThunk({
            folderId: resourceId,
            patch: { folderName: nextName },
          }),
        ).unwrap();
      }
      onOpenChange(false);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }, [dispatch, kind, resourceId, composedName, currentName, onOpenChange]);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          const el = inputRef.current;
          if (!el) return;
          el.focus();
          // Select the whole basename so typing replaces it; the extension
          // field is a separate input so it can't be clobbered.
          el.setSelectionRange(0, base.length);
        }}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>
            Rename {kind === "file" ? "file" : "folder"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {kind === "file"
              ? "The extension is shown separately so it isn't changed by accident."
              : "Children move with the folder."}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {kind === "file" && originalExt ? (
          <div className="flex items-stretch gap-1.5">
            <input
              ref={inputRef}
              type="text"
              value={base}
              onChange={(e) => setBase(e.target.value)}
              placeholder={originalBase}
              className="flex-1 min-w-0 rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              style={{ fontSize: "16px" }}
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
            />
            <input
              ref={extInputRef}
              type="text"
              value={ext}
              onChange={(e) => {
                const v = e.target.value;
                // Auto-prefix the dot so users typing "txt" still produce
                // ".txt" — only fight the user when they type whitespace.
                if (v && !v.startsWith(".") && v !== "") {
                  setExt("." + v);
                } else {
                  setExt(v);
                }
              }}
              aria-label="File extension"
              title={
                extChanged
                  ? "Changing the extension changes the file type — be careful."
                  : "File extension"
              }
              className={cn(
                "w-24 shrink-0 rounded-md border bg-muted/40 px-2 py-2 text-sm outline-none focus:ring-2",
                extChanged
                  ? "border-amber-500/70 text-amber-600 dark:text-amber-400 focus:ring-amber-400"
                  : "text-muted-foreground focus:ring-ring",
              )}
              style={{ fontSize: "16px" }}
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleSubmit();
                }
              }}
            />
          </div>
        ) : (
          <input
            ref={inputRef}
            type="text"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            placeholder={originalBase}
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
        )}

        {extChanged ? (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            You changed the file extension from{" "}
            <span className="font-mono">{originalExt || "(none)"}</span> to{" "}
            <span className="font-mono">{ext || "(none)"}</span>. The file type
            will change.
          </p>
        ) : null}
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
