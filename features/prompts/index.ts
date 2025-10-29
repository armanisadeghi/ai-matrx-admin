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

// Services
export { PromptExecutionService, promptExecutionService, executePrompt } from './services/prompt-execution-service';

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

// Hooks
export { usePromptExecution } from './hooks/usePromptExecution';
export { usePromptModal, openPromptModal } from './hooks/usePromptModal';

// Components
export { PromptExecutionButton, PromptExecutionIconButton } from './components/PromptExecutionButton';
export { PromptContextMenu, TextSelectionPromptMenu } from './components/PromptContextMenu';
export { PromptExecutionModal } from './components/PromptExecutionModal';

