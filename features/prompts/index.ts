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
  PromptRunnerModalProps,
  PromptData,
  ExecutionResult as ModalExecutionResult,
  UsePromptRunnerModalReturn,
  PromptRunnerModalConfig,
  // New execution config system
  NewExecutionConfig,
  ResultDisplay,
  PromptExecutionRequest,
  PromptExecutionConfiguration
} from './types/modal';

// Execution Config Utilities
export {
  resolveExecutionConfig,
  getExecutionConfigFromModalConfig
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
export type { PromptRunnerProps } from './components/results-display/PromptRunner';

// Services
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
export { usePromptRunner } from './hooks/usePromptRunner'; // NEW: Redux-based prompt runner

// Components
export { PromptExecutionButton, PromptExecutionIconButton } from './components/actions/PromptExecutionButton';
export { PromptContextMenu, TextSelectionPromptMenu } from './components/PromptContextMenu';
export { ConvertToBuiltinModal } from './components/layouts/ConvertToBuiltinModal';
export { PromptImporter } from './components/common/PromptImporter';
export { PromptRunner } from './components/results-display/PromptRunner';
export { PromptRunnerModal } from './components/results-display/PromptRunnerModal';
export { PromptRunnerModalSidebarTester } from './components/runner-tester/PromptRunnerModalSidebarTester';

// System Prompts Components
export { PromptExecutionCard, PromptExecutionCardsGrid, createPromptCard } from './components/dynamic/PromptExecutionCard';

