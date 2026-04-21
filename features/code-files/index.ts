// features/code-files/index.ts
//
// Public entry point for the code-files feature.

export { CodeFilesAPI } from "./service/codeFilesApi";
export type {
  CreateCodeFileInput,
  UpdateCodeFileInput,
  CreateCodeFolderInput,
  UpdateCodeFolderInput,
} from "./service/codeFilesApi";
export type {
  CodeFile,
  CodeFolder,
  CodeFileRecord,
  CodeFilesSliceState,
  CodeFileFetchStatus,
} from "./redux/code-files.types";
export { S3_OFFLOAD_THRESHOLD_BYTES } from "./redux/code-files.types";
export { codeFilesActions, codeFilesReducer } from "./redux/slice";
export {
  loadCodeFilesList,
  loadCodeFolders,
  loadCodeFileFull,
  loadCodeFilesFull,
  createCodeFileThunk,
  saveFileNow,
  deleteCodeFileThunk,
  createCodeFolderThunk,
  updateCodeFolderThunk,
  deleteCodeFolderThunk,
} from "./redux/thunks";
export * from "./redux/selectors";

// Action UI
export { useQuickSaveCode } from "./actions/useQuickSaveCode";
export {
  QuickSaveCodeCore,
  type CodePostSaveAction,
  type QuickSaveCodeCoreProps,
} from "./actions/QuickSaveCodeCore";
export {
  QuickSaveCodeDialog,
  type QuickSaveCodeDialogProps,
} from "./actions/QuickSaveCodeDialog";
export {
  SaveToCodeButton,
  type SaveToCodeButtonProps,
} from "./actions/SaveToCodeButton";
export {
  LANGUAGE_OPTIONS,
  languageFromName,
  extensionForLanguage,
  type LanguageOption,
} from "./actions/languageOptions";
