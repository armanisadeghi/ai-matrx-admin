/**
 * Prompt Execution Engine - Barrel Exports
 * 
 * Central Redux-based execution system for ALL prompts.
 * 
 * ARCHITECTURE:
 * - ExecutionInstance: Stable core data (identity, config, messages)
 * - Isolated maps: currentInputs, resources, uiState (high-frequency updates)
 * - Granular selectors: Target exactly what you need to minimize re-renders
 */

// Slice & Reducer
export { default as promptExecutionReducer } from './slice';

// ========== ACTIONS ==========

// Instance Management
export {
  createInstance,
  removeInstance,
  setInstanceStatus,
} from './slice';

// Input & Resources (ISOLATED - high frequency)
export {
  setCurrentInput,
  clearCurrentInput,
  setResources,
  addResource,
  removeResource,
  clearResources,
} from './slice';

// UI State (ISOLATED)
export {
  setExpandedVariable,
  toggleShowVariables,
  setShowVariables,
} from './slice';

// Variables
export {
  updateVariable,
  updateVariables,
  setComputedVariables,
} from './slice';

// Messages & Conversation
export {
  addMessage,
  clearConversation,
} from './slice';

// Execution
export {
  startExecution,
  startStreaming,
  completeExecution,
} from './slice';

// Run Tracking
export {
  setRunId,
} from './slice';

// Scoped Variables
export {
  setScopedVariablesStatus,
  setScopedVariables,
  clearScopedVariables,
} from './slice';

// ========== BASIC SELECTORS (from slice) ==========
export {
  selectInstance,
  selectAllInstances,
  selectInstancesByPromptId,
  selectCurrentInput,
  selectResources,
  selectUIState,
  selectMessages,
  selectInstanceStatus,
  selectInstanceError,
  selectUserVariables,
  selectExecutionTracking,
  selectRunTracking,
  selectExecutionConfig,
  selectScopedVariables,
  // Stable empty references for use in hooks
  EMPTY_ARRAY,
  EMPTY_MESSAGES,
  EMPTY_OBJECT,
  DEFAULT_UI_STATE,
} from './slice';

// ========== MEMOIZED SELECTORS (from selectors.ts) ==========
export {
  selectMergedVariables,
  selectTemplateMessages,
  selectConversationMessages,
  selectResolvedMessages,
  selectSystemMessage,
  selectConversationTemplate,
  selectStreamingTextForInstance,
  selectIsResponseEndedForInstance,
  selectDisplayMessages,
  selectInstanceStats,
  selectLiveStreamingStats,
  selectIsReadyToExecute,
  selectPromptSettings,
  selectHasUnsavedChanges,
  selectIsExecuting,
  selectIsStreaming,
  selectHasError,
  selectExpandedVariable,
  selectShowVariables,
  selectRequiresVariableReplacement,
} from './selectors';

// ========== THUNKS ==========
export { startPromptInstance } from './thunks/startInstanceThunk';
export { executeMessage } from './thunks/executeMessageThunk';
export { completeExecutionThunk } from './thunks/completeExecutionThunk';
export { fetchScopedVariables } from './thunks/fetchScopedVariablesThunk';
export { startPromptAction } from './thunks/startPromptActionThunk';
export { executeBuiltinWithCodeExtraction } from './thunks/executeBuiltinWithCodeExtractionThunk';
export { executeBuiltinWithJsonExtraction } from './thunks/executeBuiltinWithJsonExtractionThunk';
export type { StartActionPayload } from './thunks/startPromptActionThunk';

// ========== TYPES ==========
export type {
  PromptExecutionState,
  ExecutionInstance,
  ExecutionConfig,
  ExecutionVariables,
  ConversationMessage,
  ExecutionTracking,
  RunTracking,
  ExecutionStatus,
  ScopedVariables,
  InstanceUIState,
  StartInstancePayload,
  ExecuteMessagePayload,
  CompleteExecutionPayload,
  UpdateVariablePayload,
  SetCurrentInputPayload,
  FetchScopedVariablesPayload,
} from './types';

// ========== BUILTIN HELPERS ==========
export {
  PROMPT_BUILTINS,
  createBuiltinConfig,
  getBuiltinId,
  getBuiltinInfoById,
  getBuiltinInfoByKey,
  resolveBuiltinId,
} from './builtins';
export type { PromptBuiltin } from './builtins';
