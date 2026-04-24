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
