// Window components
export { ContentEditorWindow } from "./ContentEditorWindow";
export { ContentEditorListWindow } from "./ContentEditorListWindow";
export { ContentEditorWorkspaceWindow } from "./ContentEditorWorkspaceWindow";

// Consumer-side imperative opener
export {
  useOpenContentEditorWindow,
  type ContentEditorSeedDocument,
  type ContentEditorWindowHandle,
  type OpenContentEditorWindowOptions,
  type OpenContentEditorListWindowOptions,
  type OpenContentEditorWorkspaceWindowOptions,
  type AnyOpenContentEditorOptions,
} from "./useOpenContentEditorWindow";

// Low-level callback group helpers (rarely needed directly)
export {
  createContentEditorCallbackGroup,
  emitContentEditorEvent,
  type ContentEditorWindowEvent,
  type ContentEditorWindowEventType,
  type ContentEditorWindowHandlers,
  type ContentEditorReadyEvent,
  type ContentEditorChangeEvent,
  type ContentEditorSaveEvent,
  type ContentEditorModeChangeEvent,
  type ContentEditorActiveChangeEvent,
  type ContentEditorOpenDocumentEvent,
  type ContentEditorCloseTabEvent,
  type ContentEditorDocumentsChangeEvent,
  type ContentEditorWindowCloseEvent,
} from "./callbacks";
