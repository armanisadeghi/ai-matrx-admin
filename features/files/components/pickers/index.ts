/**
 * features/files/components/pickers/index.ts
 *
 * Pickers barrel — declarative components, hooks, and the imperative host.
 */

export { FilePicker, useFilePicker } from "./FilePicker";
export type {
  FilePickerProps,
  UseFilePickerOpenOptions,
  UseFilePickerResult,
} from "./FilePicker";

export { FolderPicker, useFolderPicker } from "./FolderPicker";
export type {
  FolderPickerProps,
  UseFolderPickerOpenOptions,
  UseFolderPickerResult,
} from "./FolderPicker";

export { SaveAsDialog, useSaveAs } from "./SaveAsDialog";
export type {
  SaveAsDialogProps,
  SaveAsDestination,
  UseSaveAsOpenOptions,
  UseSaveAsResult,
} from "./SaveAsDialog";

export {
  CloudFilesPickerHost,
  openFilePicker,
  openFolderPicker,
  openSaveAs,
} from "./CloudFilesPickerHost";
