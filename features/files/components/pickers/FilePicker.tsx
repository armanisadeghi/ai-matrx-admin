/**
 * features/files/components/pickers/FilePicker.tsx
 *
 * Opinionated file picker. Thin wrapper over `PickerShell` (which is already
 * adaptive Dialog↔Drawer). Ships both a declarative `<FilePicker>` component
 * and a promise-based `useFilePicker()` hook.
 *
 * Imperative usage:
 *   const { open, element } = useFilePicker();
 *   // render {element} once in your tree
 *   const fileIds = await open({ multi: true, allowedExtensions: ["pdf"] });
 *
 * Declarative usage:
 *   <FilePicker open={open} onOpenChange={setOpen} onSelect={setFileIds} />
 */

"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { PickerShell } from "@/features/files/components/surfaces/PickerShell";

// ---------------------------------------------------------------------------
// Declarative component
// ---------------------------------------------------------------------------

export interface FilePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** File ids on confirm (empty array if user cancels). */
  onSelect: (fileIds: string[]) => void;
  /** Default: false (single select). */
  multi?: boolean;
  /** Start inside this folder. Default: root. */
  initialFolderId?: string | null;
  /** Restrict by extension (case-insensitive, no leading dot). */
  allowedExtensions?: string[];
  title?: string;
  description?: string;
}

export function FilePicker({
  open,
  onOpenChange,
  onSelect,
  multi,
  initialFolderId,
  allowedExtensions,
  title = "Choose a file",
  description,
}: FilePickerProps) {
  const handleConfirm = useCallback(
    ({ fileIds }: { fileIds: string[]; folderId: string | null }) => {
      onSelect(fileIds);
    },
    [onSelect],
  );

  return (
    <PickerShell
      open={open}
      onOpenChange={onOpenChange}
      mode="file"
      multi={multi}
      initialFolderId={initialFolderId ?? null}
      onConfirm={handleConfirm}
      title={title}
      description={description}
      allowedExtensions={allowedExtensions}
    />
  );
}

// ---------------------------------------------------------------------------
// Imperative hook
// ---------------------------------------------------------------------------

export interface UseFilePickerOpenOptions {
  multi?: boolean;
  initialFolderId?: string | null;
  allowedExtensions?: string[];
  title?: string;
  description?: string;
}

export interface UseFilePickerResult {
  /**
   * Opens the picker. Resolves with the selected file ids, or `null` if
   * the user cancelled.
   */
  open: (options?: UseFilePickerOpenOptions) => Promise<string[] | null>;
  /** Mount once in your tree — e.g. at the top of your component. */
  element: React.ReactNode;
  /** True while the picker is open. */
  isOpen: boolean;
}

export function useFilePicker(): UseFilePickerResult {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<UseFilePickerOpenOptions | null>(
    null,
  );
  const resolverRef = useRef<((result: string[] | null) => void) | null>(null);

  const open = useCallback(
    (nextOptions: UseFilePickerOpenOptions = {}) =>
      new Promise<string[] | null>((resolve) => {
        resolverRef.current?.(null);
        resolverRef.current = resolve;
        setOptions(nextOptions);
        setIsOpen(true);
      }),
    [],
  );

  const handleOpenChange = useCallback((next: boolean) => {
    if (!next) {
      // Cancelled (outside click, Esc, Close button).
      resolverRef.current?.(null);
      resolverRef.current = null;
    }
    setIsOpen(next);
  }, []);

  const handleSelect = useCallback((fileIds: string[]) => {
    resolverRef.current?.(fileIds);
    resolverRef.current = null;
  }, []);

  const element = useMemo(
    () =>
      options ? (
        <FilePicker
          open={isOpen}
          onOpenChange={handleOpenChange}
          onSelect={handleSelect}
          multi={options.multi}
          initialFolderId={options.initialFolderId}
          allowedExtensions={options.allowedExtensions}
          title={options.title}
          description={options.description}
        />
      ) : null,
    [isOpen, options, handleOpenChange, handleSelect],
  );

  return { open, element, isOpen };
}
