/**
 * features/files/components/pickers/FolderPicker.tsx
 *
 * Single-folder picker — used for "move to…" and "upload to…" flows.
 * Returns the selected folder id (or `null` for root).
 */

"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { PickerShell } from "@/features/files/components/surfaces/PickerShell";

// ---------------------------------------------------------------------------
// Declarative component
// ---------------------------------------------------------------------------

export interface FolderPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the selected folder id (null = root). */
  onSelect: (folderId: string | null) => void;
  initialFolderId?: string | null;
  title?: string;
  description?: string;
}

export function FolderPicker({
  open,
  onOpenChange,
  onSelect,
  initialFolderId,
  title = "Choose a folder",
  description,
}: FolderPickerProps) {
  const handleConfirm = useCallback(
    ({ folderId }: { fileIds: string[]; folderId: string | null }) => {
      onSelect(folderId);
    },
    [onSelect],
  );

  return (
    <PickerShell
      open={open}
      onOpenChange={onOpenChange}
      mode="folder"
      initialFolderId={initialFolderId ?? null}
      onConfirm={handleConfirm}
      title={title}
      description={description}
    />
  );
}

// ---------------------------------------------------------------------------
// Imperative hook
// ---------------------------------------------------------------------------

export interface UseFolderPickerOpenOptions {
  initialFolderId?: string | null;
  title?: string;
  description?: string;
}

export interface UseFolderPickerResult {
  /** Resolves with a folder id (or `null` for root) — or the special sentinel `undefined` if cancelled. */
  open: (
    options?: UseFolderPickerOpenOptions,
  ) => Promise<string | null | undefined>;
  element: React.ReactNode;
  isOpen: boolean;
}

export function useFolderPicker(): UseFolderPickerResult {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<UseFolderPickerOpenOptions | null>(
    null,
  );
  const resolverRef = useRef<
    ((result: string | null | undefined) => void) | null
  >(null);

  const open = useCallback(
    (nextOptions: UseFolderPickerOpenOptions = {}) =>
      new Promise<string | null | undefined>((resolve) => {
        resolverRef.current?.(undefined);
        resolverRef.current = resolve;
        setOptions(nextOptions);
        setIsOpen(true);
      }),
    [],
  );

  const handleOpenChange = useCallback((next: boolean) => {
    if (!next) {
      resolverRef.current?.(undefined);
      resolverRef.current = null;
    }
    setIsOpen(next);
  }, []);

  const handleSelect = useCallback((folderId: string | null) => {
    resolverRef.current?.(folderId);
    resolverRef.current = null;
  }, []);

  const element = useMemo(
    () =>
      options ? (
        <FolderPicker
          open={isOpen}
          onOpenChange={handleOpenChange}
          onSelect={handleSelect}
          initialFolderId={options.initialFolderId}
          title={options.title}
          description={options.description}
        />
      ) : null,
    [isOpen, options, handleOpenChange, handleSelect],
  );

  return { open, element, isOpen };
}
