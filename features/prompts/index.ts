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

// Core Types
export type {
  PromptVariable,
  PromptMessage,
  PromptMessageRole,
  PromptSettings as PromptModelConfig,
  VariableComponentType,
  VariableCustomComponent
} from './types/core';

// Component Types
export type { PromptRunnerProps } from './components/modal/PromptRunner';

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
export { PromptExecutionButton, PromptExecutionIconButton } from './components/actions/PromptExecutionButton';
export { PromptContextMenu, TextSelectionPromptMenu } from './components/PromptContextMenu';
export { PromptExecutionModal } from './components/actions/PromptExecutionModal';
export { ConvertToBuiltinModal } from './components/actions/ConvertToBuiltinModal';
export { PromptImporter } from './components/common/PromptImporter';
export { PromptRunner } from './components/modal/PromptRunner';
export { PromptRunnerModal } from './components/modal/PromptRunnerModal';
export { PromptRunnerModalTester } from './components/modal/PromptRunnerModalTester';
export { PromptRunnerModalSidebarTester } from './components/modal/PromptRunnerModalSidebarTester';

// System Prompts Components
export { PromptExecutionCard, PromptExecutionCardsGrid, createPromptCard } from './components/cards/PromptExecutionCard';

