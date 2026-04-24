// ── Public API ──────────────────────────────────────────────────────────────

export { CodeWorkspace } from "./CodeWorkspace";
export type { CodeWorkspaceProps } from "./CodeWorkspace";
export {
  CodeWorkspaceProvider,
  useCodeWorkspace,
} from "./CodeWorkspaceProvider";
export type {
  CodeWorkspaceContextValue,
  CodeWorkspaceProviderProps,
} from "./CodeWorkspaceProvider";

// Hosts
export {
  CodeWorkspaceRoute,
  CodeWorkspaceWindow,
  CodeWorkspaceModal,
} from "./host";
export type { CodeWorkspaceWindowProps } from "./host";

// Adapters
export type { FilesystemAdapter, ProcessAdapter } from "./adapters";
export {
  MockFilesystemAdapter,
  SandboxFilesystemAdapter,
  SandboxProcessAdapter,
  MockProcessAdapter,
} from "./adapters";

// Types
export type {
  ActivityViewId,
  BottomTabId,
  EditorFile,
  FilesystemNode,
  FilesystemNodeKind,
  FilesystemWatchEvent,
  ProcessEvent,
  ProcessResult,
} from "./types";

// Hooks
export { useOpenFile } from "./hooks/useOpenFile";
export { useTerminalSession } from "./hooks/useTerminalSession";
export {
  useOpenLibraryFile,
  libraryTabId,
  isLibraryTabId,
  codeFileIdFromTabId,
  LIBRARY_TAB_PREFIX,
} from "./hooks/useOpenLibraryFile";
export { useSaveActiveTab } from "./hooks/useSaveActiveTab";
export type { SaveResult } from "./hooks/useSaveActiveTab";
export { useOpenSourceEntry } from "./hooks/useOpenSourceEntry";
export { useLibrarySource } from "./hooks/useLibrarySource";

// Library-source adapters — importing this module has a side effect:
// it registers the builtin adapters (prompt_apps, aga_apps,
// tool_ui_components) so the Code Library tree and save router see
// them. Re-exported here so downstream features can register their
// own custom sources without reaching into the subpath.
export {
  getLibrarySource,
  listLibrarySources,
  registerLibrarySource,
  getAdapterForTabId,
  RemoteConflictError,
  isRemoteConflictError,
} from "./library-sources";
export type {
  LibrarySourceAdapter,
  LoadedSourceEntry,
  SaveSourceArgs,
  SaveSourceResult,
  SourceEntry,
  SourceEntryField,
} from "./library-sources";

// Cross-surface actions — use these from any feature that generates code to
// drop content into the `/code` workspace with a single call.
export {
  useSaveAndOpenInCodeEditor,
  CHAT_CAPTURES_FOLDER_NAME,
} from "./actions/saveAndOpenInCodeEditor";
export type {
  SaveAndOpenInCodeEditorInput,
  SaveAndOpenInCodeEditorResult,
} from "./actions/saveAndOpenInCodeEditor";

// Runtime — programmatic control for agent tools and server actions.
export {
  registerWorkspace,
  getWorkspace,
  tryGetWorkspace,
  listWorkspaceIds,
  subscribeWorkspace,
  DEFAULT_WORKSPACE_ID,
  runShellCommand,
  readWorkspaceFile,
  writeWorkspaceFile,
  listWorkspaceDirectory,
  openWorkspaceFile,
  appendAgentTerminalLine,
} from "./runtime";
export type { WorkspaceRuntimeHandle } from "./runtime";

// Chat slots (for custom hosts that want their own rightSlot/farRightSlot).
export { ChatPanelSlot, ChatHistorySlot, AgentPicker } from "./chat";
