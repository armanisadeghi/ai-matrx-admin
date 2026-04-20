/**
 * Smart Code Editor — barrel export.
 *
 * The agent-system replacement for `features/code-editor/components/AICodeEditor*`.
 */

// Components
export { SmartCodeEditor } from "./components/SmartCodeEditor";
export type { SmartCodeEditorProps } from "./components/SmartCodeEditor";

export { SmartCodeEditorModal } from "./components/SmartCodeEditorModal";
export type { SmartCodeEditorModalProps } from "./components/SmartCodeEditorModal";

// Parts (exported so other surfaces can reuse them)
export { DiffView } from "./components/parts/DiffView";
export { ProcessingOverlay } from "./components/parts/ProcessingOverlay";
export { ReviewStage } from "./components/parts/ReviewStage";
export { ErrorPanel } from "./components/parts/ErrorPanel";

// Hooks
export { useSmartCodeEditor } from "./hooks/useSmartCodeEditor";
export { useIdeContextSync } from "./hooks/useIdeContextSync";
export { useCodeEditorWidgetHandle } from "./hooks/useCodeEditorWidgetHandle";

// Types
export type {
  CodeEditorState,
  CodeContextInput,
  UseSmartCodeEditorReturn,
} from "./types";

// Utilities
export * from "./utils";

// Constants
export {
  VSC_CONTEXT_KEYS,
  VSC_CONTEXT_LABELS,
  SMART_CODE_EDITOR_SURFACE_KEY,
  type VscContextKey,
} from "./constants";
