/**
 * features/files/components/pickers/cloudFilesPickerOpeners.ts
 *
 * Pure-TS imperative API for the cloud files pickers, statically importable everywhere (thunks, non-React code).
 * Each call asks the summon overlay `cloudFilesPicker` through requestOverlay; its body
 * (CloudFilesPickerDialog.tsx: FilePickerWindow / FolderPicker / SaveAsDialog) loads only when asked.
 */

import type { UseFolderPickerOpenOptions } from "./FolderPicker";
import type { SaveAsDestination, UseSaveAsOpenOptions } from "./SaveAsDialog";
import { requestOverlay } from "@/features/overlays/requestOverlay";

/**
 * Options for `openFilePicker`. Since 2026-07-20 the opener mounts THE one
 * canonical file picker (`FilesResourcePicker` in a non-blocking
 * `FilePickerWindow`) — the legacy thin FilePicker dialog is deleted.
 * `allowedExtensions` is mapped to the canonical picker's type filter.
 */
export interface UseFilePickerOpenOptions {
  multi?: boolean;
  initialFolderId?: string | null;
  allowedExtensions?: string[];
  title?: string;
  description?: string;
  /**
   * WHAT THE WINDOW LISTS: the initial organization filter. Absent = All organizations (every
   * file the person holds); the window shows a visible filter to narrow or clear it. A FILTER on
   * what is shown, never a permission, never the active organization.
   */
  organizationFilter?: string | null;
  /**
   * WHERE AN UPLOAD GOES, separate from what is listed. Absent = the active organization through
   * the upload choke point's organization gate. The data grid's attachment cell names the
   * TABLE's organization here (AO-168).
   */
  uploadOrganizationId?: string | null;
}

export type FileOpener = (
  options?: UseFilePickerOpenOptions,
) => Promise<string[] | null>;

export type FolderOpener = (
  options?: UseFolderPickerOpenOptions,
) => Promise<string | null | undefined>;

export type SaveAsOpener = (
  options?: UseSaveAsOpenOptions,
) => Promise<SaveAsDestination | null>;

export type CloudFilesPickerRequest =
  | { mode: "file"; options: UseFilePickerOpenOptions }
  | { mode: "folder"; options: UseFolderPickerOpenOptions }
  | { mode: "saveAs"; options: UseSaveAsOpenOptions };

export type CloudFilesPickerAnswer = string[] | string | null | undefined | SaveAsDestination;

// Every picker is the summon overlay `cloudFilesPicker`, asked through requestOverlay: never in the tree until
// asked, and closing it any way answers the cancel value below.

/** File ids, or `null` when the person closed the picker without choosing. */
export function openFilePicker(options: UseFilePickerOpenOptions = {}): Promise<string[] | null> {
  return requestOverlay<CloudFilesPickerRequest, string[] | null>("cloudFilesPicker", { mode: "file", options }, { cancel: null });
}

/** A folder id (`null` = root), or `undefined` when canceled. */
export function openFolderPicker(options: UseFolderPickerOpenOptions = {}): Promise<string | null | undefined> {
  return requestOverlay<CloudFilesPickerRequest, string | null | undefined>(
    "cloudFilesPicker",
    { mode: "folder", options },
    { cancel: undefined },
  );
}

/** The chosen destination, or `null` when canceled. */
export function openSaveAs(options: UseSaveAsOpenOptions = {}): Promise<SaveAsDestination | null> {
  return requestOverlay<CloudFilesPickerRequest, SaveAsDestination | null>("cloudFilesPicker", { mode: "saveAs", options }, { cancel: null });
}
