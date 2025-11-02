/**
 * Prompts Feature - Main Export
 * 
 * Provides programmatic prompt execution capabilities throughout the application
 */

// Types
export type {
  VariableSource,
  VariableSourceMap,
  OutputHandler,
  PromptExecutionConfig,
  ExecutionProgress,
  ExecutionError,
  ExecutionResult,
  PromptExecutionButtonProps,
  ContextMenuPromptOption,
  PromptContextMenuProps,
  UsePromptExecutionReturn,
  PromptExecutionData
} from './types/execution';

// Data Source Types
export type {
  TableBookmark,
  TableBookmarkType,
  FullTableBookmark,
  TableRowBookmark,
  TableColumnBookmark,
  TableCellBookmark,
  VariableDataSource
} from './types/data-sources';

// Prompt JSON Types
export type {
  PromptJSON,
  PromptMessageJSON,
  PromptVariableJSON,
  PromptSettingsJSON,
  PromptBatchJSON,
  PromptImportResult,
  PromptBatchImportResult
} from './types/prompt-json';

// Modal Types
export type {
  PromptExecutionMode,
  PromptRunnerModalProps,
  PromptData,
  ExecutionResult as ModalExecutionResult,
  UsePromptRunnerModalReturn,
  PromptRunnerModalConfig
} from './types/modal';

// Component Types
export type { PromptRunnerProps, PromptVariable } from './components/modal/PromptRunner';

// Services
export { PromptExecutionService, promptExecutionService, executePrompt } from './services/prompt-execution-service';
export { importPrompt, importPromptBatch, exportPromptAsJSON } from './services/prompt-import-service';

// Utilities
export {
  resolveVariables,
  resolveVariable,
  replaceVariablesInText,
  extractVariables,
  extractVariablesFromMessages,
  validateVariableSources,
  createHardcodedMap,
  mergeVariableSources
} from './utils/variable-resolver';

export {
  createPromptJSON,
  systemMessage,
  userMessage,
  assistantMessage,
  variable,
  defaultSettings,
  formatPromptJSON,
  createBatchJSON,
  quickPrompt
} from './utils/prompt-json-generator';

// Hooks
export { usePromptExecution } from './hooks/usePromptExecution';
export { usePromptModal, openPromptModal } from './hooks/usePromptModal';
export { usePromptRunnerModal } from './hooks/usePromptRunnerModal';

// Components
export { PromptExecutionButton, PromptExecutionIconButton } from './components/PromptExecutionButton';
export { PromptContextMenu, TextSelectionPromptMenu } from './components/PromptContextMenu';
export { PromptExecutionModal } from './components/PromptExecutionModal';
export { PromptImporter } from './components/PromptImporter';
export { PromptRunner } from './components/modal/PromptRunner';
export { PromptRunnerModal } from './components/modal/PromptRunnerModal';
export { PromptRunnerModalTester } from './components/modal/PromptRunnerModalTester';
export { PromptRunnerModalSidebarTester } from './components/modal/PromptRunnerModalSidebarTester';

