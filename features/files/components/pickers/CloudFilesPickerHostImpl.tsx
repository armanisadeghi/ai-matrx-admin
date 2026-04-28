/**
 * features/files/components/pickers/CloudFilesPickerHostImpl.tsx
 *
 * Heavy body for `<CloudFilesPickerHost />` — mounts the FilePicker,
 * FolderPicker, and SaveAsDialog and registers the imperative openers
 * with `cloudFilesPickerOpeners.ts` so the public API
 * (`openFilePicker` / `openFolderPicker` / `openSaveAs`) can resolve to
 * a real dialog.
 *
 * Lazy-loaded by `CloudFilesPickerHost.tsx`. Until the chunk loads and
 * the host mounts, the imperative API short-circuits to `null` /
 * `undefined` (with a dev warning). See `cloudFilesPickerOpeners.ts`.
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
import {
  _setOpeners,
  _clearOpeners,
  type FileOpener,
  type FolderOpener,
  type SaveAsOpener,
} from "./cloudFilesPickerOpeners";

export default function CloudFilesPickerHostImpl() {
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
    _setOpeners(fileOpener, folderOpener, saveAsOpener);
    return () => {
      _clearOpeners();
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
