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
