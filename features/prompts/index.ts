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
export { usePromptExecution, usePrompt } from './hooks/usePromptExecution';

// Components
export { PromptExecutionButton, PromptExecutionIconButton } from './components/PromptExecutionButton';
export { PromptContextMenu, TextSelectionPromptMenu } from './components/PromptContextMenu';

