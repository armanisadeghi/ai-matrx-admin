/**
 * features/files/components/pickers/CloudFilesPickerHost.tsx
 *
 * App-level singleton that mounts each picker (File / Folder / SaveAs) and
 * exposes imperative `openFilePicker` / `openFolderPicker` / `openSaveAs`
 * functions usable from anywhere in the app — Redux thunks, non-React code,
 * deeply-nested components that don't want to thread picker state around.
 *
 * Usage:
 *   // Once at the app root (e.g. in app/Providers.tsx):
 *   <CloudFilesPickerHost />
 *
 *   // Anywhere else:
 *   import { openFilePicker } from "@/features/files/components/pickers/CloudFilesPickerHost";
 *   const fileIds = await openFilePicker({ multi: true });
 *
 * The imperative functions are NO-OPs until the host mounts. If you call
 * them before mount (SSR, very-early init) they resolve to `null`.
 */

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilePicker, type UseFilePickerOpenOptions } from "./FilePicker";
import { FolderPicker, type UseFolderPickerOpenOptions } from "./FolderPicker";
import {
  SaveAsDialog,
  type SaveAsDestination,
  type UseSaveAsOpenOptions,
} from "./SaveAsDialog";

// ---------------------------------------------------------------------------
// Module-level registry — one active host at a time.
// ---------------------------------------------------------------------------

type FileOpener = (
  options?: UseFilePickerOpenOptions,
) => Promise<string[] | null>;

type FolderOpener = (
  options?: UseFolderPickerOpenOptions,
) => Promise<string | null | undefined>;

type SaveAsOpener = (
  options?: UseSaveAsOpenOptions,
) => Promise<SaveAsDestination | null>;

let activeFileOpener: FileOpener | null = null;
let activeFolderOpener: FolderOpener | null = null;
let activeSaveAsOpener: SaveAsOpener | null = null;

// ---------------------------------------------------------------------------
// Public imperative API
// ---------------------------------------------------------------------------

/**
 * Open the shared FilePicker. Requires `<CloudFilesPickerHost />` to be
 * mounted somewhere in the tree (typically at the app root).
 */
export async function openFilePicker(
  options: UseFilePickerOpenOptions = {},
): Promise<string[] | null> {
  if (!activeFileOpener) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        "[cloud-files] openFilePicker called without a mounted <CloudFilesPickerHost />; returning null.",
      );
    }
    return null;
  }
  return activeFileOpener(options);
}

/**
 * Open the shared FolderPicker. Returns the chosen folder id (or `null` for
 * root), or `undefined` if cancelled.
 */
export async function openFolderPicker(
  options: UseFolderPickerOpenOptions = {},
): Promise<string | null | undefined> {
  if (!activeFolderOpener) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        "[cloud-files] openFolderPicker called without a mounted <CloudFilesPickerHost />.",
      );
    }
    return undefined;
  }
  return activeFolderOpener(options);
}

/** Open the shared SaveAs dialog. */
export async function openSaveAs(
  options: UseSaveAsOpenOptions = {},
): Promise<SaveAsDestination | null> {
  if (!activeSaveAsOpener) {
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        "[cloud-files] openSaveAs called without a mounted <CloudFilesPickerHost />.",
      );
    }
    return null;
  }
  return activeSaveAsOpener(options);
}

// ---------------------------------------------------------------------------
// Host component
// ---------------------------------------------------------------------------

export function CloudFilesPickerHost() {
  // File picker state
  const [fileOpen, setFileOpen] = useState(false);
  const [fileOptions, setFileOptions] =
    useState<UseFilePickerOpenOptions | null>(null);
  const fileResolverRef = useRef<((r: string[] | null) => void) | null>(null);

  // Folder picker state
  const [folderOpen, setFolderOpen] = useState(false);
  const [folderOptions, setFolderOptions] =
    useState<UseFolderPickerOpenOptions | null>(null);
  const folderResolverRef = useRef<
    ((r: string | null | undefined) => void) | null
  >(null);

  // SaveAs state
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [saveAsOptions, setSaveAsOptions] =
    useState<UseSaveAsOpenOptions | null>(null);
  const saveAsResolverRef = useRef<
    ((r: SaveAsDestination | null) => void) | null
  >(null);

  // Imperative openers — stable function refs.
  const fileOpener: FileOpener = useCallback(
    (options = {}) =>
      new Promise<string[] | null>((resolve) => {
        fileResolverRef.current?.(null);
        fileResolverRef.current = resolve;
        setFileOptions(options);
        setFileOpen(true);
      }),
    [],
  );

  const folderOpener: FolderOpener = useCallback(
    (options = {}) =>
      new Promise<string | null | undefined>((resolve) => {
        folderResolverRef.current?.(undefined);
        folderResolverRef.current = resolve;
        setFolderOptions(options);
        setFolderOpen(true);
      }),
    [],
  );

  const saveAsOpener: SaveAsOpener = useCallback(
    (options = {}) =>
      new Promise<SaveAsDestination | null>((resolve) => {
        saveAsResolverRef.current?.(null);
        saveAsResolverRef.current = resolve;
        setSaveAsOptions(options);
        setSaveAsOpen(true);
      }),
    [],
  );

  // Register as the active openers on mount; clear on unmount.
  useEffect(() => {
    activeFileOpener = fileOpener;
    activeFolderOpener = folderOpener;
    activeSaveAsOpener = saveAsOpener;
    return () => {
      activeFileOpener = null;
      activeFolderOpener = null;
      activeSaveAsOpener = null;
    };
  }, [fileOpener, folderOpener, saveAsOpener]);

  // File picker handlers
  const handleFileOpenChange = useCallback((next: boolean) => {
    if (!next) {
      fileResolverRef.current?.(null);
      fileResolverRef.current = null;
    }
    setFileOpen(next);
  }, []);
  const handleFileSelect = useCallback((fileIds: string[]) => {
    fileResolverRef.current?.(fileIds);
    fileResolverRef.current = null;
  }, []);

  // Folder picker handlers
  const handleFolderOpenChange = useCallback((next: boolean) => {
    if (!next) {
      folderResolverRef.current?.(undefined);
      folderResolverRef.current = null;
    }
    setFolderOpen(next);
  }, []);
  const handleFolderSelect = useCallback((folderId: string | null) => {
    folderResolverRef.current?.(folderId);
    folderResolverRef.current = null;
  }, []);

  // SaveAs handlers
  const handleSaveAsOpenChange = useCallback((next: boolean) => {
    if (!next) {
      saveAsResolverRef.current?.(null);
      saveAsResolverRef.current = null;
    }
    setSaveAsOpen(next);
  }, []);
  const handleSaveAsSave = useCallback((dest: SaveAsDestination) => {
    saveAsResolverRef.current?.(dest);
    saveAsResolverRef.current = null;
  }, []);

  // Memoize picker elements to avoid unnecessary remounts.
  const filePickerElement = useMemo(
    () =>
      fileOptions ? (
        <FilePicker
          open={fileOpen}
          onOpenChange={handleFileOpenChange}
          onSelect={handleFileSelect}
          multi={fileOptions.multi}
          initialFolderId={fileOptions.initialFolderId}
          allowedExtensions={fileOptions.allowedExtensions}
          title={fileOptions.title}
          description={fileOptions.description}
        />
      ) : null,
    [fileOpen, fileOptions, handleFileOpenChange, handleFileSelect],
  );

  const folderPickerElement = useMemo(
    () =>
      folderOptions ? (
        <FolderPicker
          open={folderOpen}
          onOpenChange={handleFolderOpenChange}
          onSelect={handleFolderSelect}
          initialFolderId={folderOptions.initialFolderId}
          title={folderOptions.title}
          description={folderOptions.description}
        />
      ) : null,
    [folderOpen, folderOptions, handleFolderOpenChange, handleFolderSelect],
  );

  const saveAsElement = useMemo(
    () =>
      saveAsOptions ? (
        <SaveAsDialog
          open={saveAsOpen}
          onOpenChange={handleSaveAsOpenChange}
          onSave={handleSaveAsSave}
          defaultFileName={saveAsOptions.defaultFileName}
          initialFolderId={saveAsOptions.initialFolderId ?? null}
          title={saveAsOptions.title}
          description={saveAsOptions.description}
          confirmLabel={saveAsOptions.confirmLabel}
        />
      ) : null,
    [saveAsOpen, saveAsOptions, handleSaveAsOpenChange, handleSaveAsSave],
  );

  return (
    <>
      {filePickerElement}
      {folderPickerElement}
      {saveAsElement}
    </>
  );
}
