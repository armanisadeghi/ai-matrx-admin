/**
 * Prompt Execution Engine - Barrel Exports
 * 
 * Central Redux-based execution system for ALL prompts.
 * Eliminates closure bugs and provides single source of truth.
 */

// Slice
export {
  default as promptExecutionReducer,
  // Actions
  createInstance,
  removeInstance,
  setInstanceStatus,
  updateVariable,
  updateVariables,
  setComputedVariables,
  setCurrentInput,
  addMessage,
  clearConversation,
  startExecution,
  startStreaming,
  completeExecution,
  setRunId,
  setScopedVariablesStatus,
  setScopedVariables,
  clearScopedVariables,
  setExpandedVariable,
  toggleShowVariables,
  // Basic Selectors
  selectInstance,
  selectAllInstances,
  selectInstancesByPromptId,
  selectInstanceByRunId,
  selectScopedVariables,
} from './slice';

// Advanced Selectors
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
  selectModelConfig,
  selectHasUnsavedChanges,
} from './selectors';

// Thunks
export { startPromptInstance } from './thunks/startInstanceThunk';
export { executeMessage } from './thunks/executeMessageThunk';
export { completeExecutionThunk } from './thunks/completeExecutionThunk';
export { fetchScopedVariables } from './thunks/fetchScopedVariablesThunk';
export { startPromptAction } from './thunks/startPromptActionThunk';
export type { StartActionPayload } from './thunks/startPromptActionThunk';

// Types
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
  StartInstancePayload,
  ExecuteMessagePayload,
  CompleteExecutionPayload,
  UpdateVariablePayload,
  SetCurrentInputPayload,
  FetchScopedVariablesPayload,
} from './types';

