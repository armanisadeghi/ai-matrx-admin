/**
 * Prompt Execution Selectors
 * 
 * Memoized selectors for computed values.
 * 
 * ARCHITECTURE:
 * - Basic selectors (in slice.ts) return primitives or stable references
 * - Memoized selectors (here) compute derived values efficiently
 * - All selectors handle null/undefined gracefully with stable returns
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import {
  selectInstance,
  selectMessages,
  selectCurrentInput,
  selectResources,
  selectUIState,
  selectUserVariables,
  selectScopedVariables,
  selectInstanceStatus,
  selectExecutionTracking,
  selectRunTracking,
  // Import stable references from slice (single source of truth)
  EMPTY_ARRAY,
  EMPTY_MESSAGES,
  EMPTY_OBJECT,
} from './slice';
import { selectCachedPrompt } from '../slices/promptCacheSlice';
import {
  selectPrimaryResponseTextByTaskId,
  selectPrimaryResponseEndedByTaskId,
} from '../socket-io/selectors/socket-response-selectors';
import { replaceVariablesInText } from '@/features/prompts/utils/variable-resolver';
import type { ConversationMessage } from './types';
import type { PromptVariable } from '@/features/prompts/types/core';

// NOTE: Stable empty references imported from ./slice

// Re-export basic selectors for convenience
export {
  selectInstance,
  selectMessages,
  selectCurrentInput,
  selectResources,
  selectUIState,
  selectUserVariables,
  selectInstanceStatus,
  selectExecutionTracking,
  selectRunTracking,
} from './slice';

/**
 * Get variable definitions from cached prompt
 * Returns array of variable definitions (name, defaultValue, customComponent)
 */
export const selectVariableDefinitions = createSelector(
  [
    (state: RootState, runId: string) => {
      const instance = selectInstance(state, runId);
      return instance ? selectCachedPrompt(state, instance.promptId) : null;
    },
  ],
  (prompt): PromptVariable[] => {
    if (!prompt) return EMPTY_ARRAY as PromptVariable[];
    // Handle both variableDefaults and variable_defaults (DB naming)
    return (prompt.variableDefaults || prompt.variable_defaults || EMPTY_ARRAY) as PromptVariable[];
  }
);

/**
 * Get attachment capabilities from prompt settings
 */
export const selectAttachmentCapabilities = createSelector(
  [
    (state: RootState, runId: string) => selectInstance(state, runId),
  ],
  (instance) => {
    if (!instance) {
      return {
        supportsImageUrls: false,
        supportsFileUrls: false,
        supportsYoutubeVideos: false,
      };
    }
    
    return {
      supportsImageUrls: instance.settings?.image_urls ?? false,
      supportsFileUrls: instance.settings?.file_urls ?? false,
      supportsYoutubeVideos: instance.settings?.youtube_videos ?? false,
    };
  }
);

/**
 * Check if last message in conversation is from user
 * Used to determine if send button should be disabled
 */
export const selectIsLastMessageUser = createSelector(
  [
    (state: RootState, runId: string) => selectMessages(state, runId),
  ],
  (messages) => {
    if (messages.length === 0) return false;
    return messages[messages.length - 1].role === 'user';
  }
);

/**
 * Get merged variables for an instance
 * Priority: computedValues > userValues > scopedValues > promptDefaults
 * 
 * This is the SINGLE SOURCE OF TRUTH for variable values.
 */
export const selectMergedVariables = createSelector(
  [
    (state: RootState, runId: string) => selectInstance(state, runId),
    (state: RootState) => selectScopedVariables(state),
    (state: RootState, runId: string) => {
      const instance = selectInstance(state, runId);
      return instance ? selectCachedPrompt(state, instance.promptId) : null;
    },
  ],
  (instance, scopedVariables, prompt) => {
    if (!instance) return EMPTY_OBJECT;
    
    // Start with prompt defaults
    const defaults: Record<string, string> = {};
    if (prompt?.variableDefaults) {
      prompt.variableDefaults.forEach(v => {
        defaults[v.name] = v.defaultValue || '';
      });
    }
    
    // Merge in priority order
    return {
      ...defaults,
      ...(scopedVariables?.user || {}),
      ...(scopedVariables?.org || {}),
      ...(scopedVariables?.project || {}),
      ...instance.variables.userValues,
      ...instance.variables.computedValues,
    };
  }
);

/**
 * Get template messages from prompt (system, user, assistant templates)
 */
export const selectTemplateMessages = createSelector(
  [
    (state: RootState, runId: string) => {
      const instance = selectInstance(state, runId);
      return instance ? selectCachedPrompt(state, instance.promptId) : null;
    },
  ],
  (prompt) => {
    return prompt?.messages ?? EMPTY_MESSAGES;
  }
);

/**
 * Get conversation messages (renamed from selectConversationMessages for clarity)
 * Uses the new isolated messages array
 */
export const selectConversationMessages = createSelector(
  [
    (state: RootState, runId: string) => selectMessages(state, runId),
  ],
  (messages) => messages
);

/**
 * Get ALL messages with variables replaced
 * This is what gets sent to the API
 */
export const selectResolvedMessages = createSelector(
  [
    (state: RootState, runId: string) => selectTemplateMessages(state, runId),
    (state: RootState, runId: string) => selectMessages(state, runId),
    (state: RootState, runId: string) => selectMergedVariables(state, runId),
  ],
  (templateMessages, conversationMessages, variables) => {
    const allMessages = [...templateMessages, ...conversationMessages];
    
    return allMessages.map(msg => ({
      ...msg,
      content: replaceVariablesInText(msg.content, variables),
    }));
  }
);

/**
 * Get system message (for API)
 */
export const selectSystemMessage = createSelector(
  [
    (state: RootState, runId: string) => selectTemplateMessages(state, runId),
    (state: RootState, runId: string) => selectMergedVariables(state, runId),
  ],
  (templateMessages, variables) => {
    const systemMsg = templateMessages.find(m => m.role === 'system');
    if (!systemMsg) return '';
    
    return replaceVariablesInText(systemMsg.content, variables);
  }
);

/**
 * Get conversation template (non-system messages)
 */
export const selectConversationTemplate = createSelector(
  [
    (state: RootState, runId: string) => selectTemplateMessages(state, runId),
  ],
  (templateMessages) => {
    return templateMessages.filter(m => m.role !== 'system');
  }
);

/**
 * Get streaming text for an instance (from socket)
 */
export const selectStreamingTextForInstance = createSelector(
  [
    (state: RootState, runId: string) => {
      const instance = selectInstance(state, runId);
      return instance?.execution.currentTaskId ?? null;
    },
    (state: RootState) => state,
  ],
  (taskId, state) => {
    if (!taskId) return '';
    return selectPrimaryResponseTextByTaskId(taskId)(state);
  }
);

/**
 * Check if response ended for an instance
 */
export const selectIsResponseEndedForInstance = createSelector(
  [
    (state: RootState, runId: string) => {
      const instance = selectInstance(state, runId);
      return instance?.execution.currentTaskId ?? null;
    },
    (state: RootState) => state,
  ],
  (taskId, state) => {
    if (!taskId) return true;
    return selectPrimaryResponseEndedByTaskId(taskId)(state);
  }
);

/**
 * Get display messages (conversation + streaming if active)
 */
export const selectDisplayMessages = createSelector(
  [
    (state: RootState, runId: string) => selectMessages(state, runId),
    (state: RootState, runId: string) => selectStreamingTextForInstance(state, runId),
    (state: RootState, runId: string) => {
      const instance = selectInstance(state, runId);
      return {
        taskId: instance?.execution.currentTaskId ?? null,
        isStreaming: instance?.status === 'streaming',
        messageStartTime: instance?.execution.messageStartTime ?? null,
      };
    },
  ],
  (messages, streamingText, execution) => {
    if (execution.isStreaming && streamingText && execution.taskId) {
      return [
        ...messages,
        {
          role: 'assistant' as const,
          content: streamingText,
          taskId: execution.taskId,
          timestamp: execution.messageStartTime 
            ? new Date(execution.messageStartTime).toISOString()
            : new Date().toISOString(),
        },
      ];
    }
    return messages;
  }
);

/**
 * Get instance statistics
 */
export const selectInstanceStats = createSelector(
  [
    (state: RootState, runId: string) => selectMessages(state, runId),
    (state: RootState, runId: string) => selectRunTracking(state, runId),
    (state: RootState, runId: string) => selectExecutionTracking(state, runId),
    (state: RootState, runId: string) => selectInstanceStatus(state, runId),
  ],
  (messages, runTracking, executionTracking, status) => {
    if (!runTracking || !executionTracking) return null;
    
    return {
      messageCount: messages.length,
      totalTokens: runTracking.totalTokens,
      totalCost: runTracking.totalCost,
      lastMessageStats: executionTracking.lastMessageStats,
      status,
      hasRun: runTracking.savedToDatabase,
    };
  }
);

/**
 * Get live streaming stats
 */
export const selectLiveStreamingStats = createSelector(
  [
    (state: RootState, runId: string) => selectInstanceStatus(state, runId),
    (state: RootState, runId: string) => selectExecutionTracking(state, runId),
    (state: RootState, runId: string) => selectStreamingTextForInstance(state, runId),
  ],
  (status, executionTracking, streamingText) => {
    if (
      status !== 'streaming' ||
      !executionTracking?.messageStartTime
    ) {
      return null;
    }
    
    const currentTime = Date.now();
    const elapsedTime = currentTime - executionTracking.messageStartTime;
    const tokenCount = Math.round(streamingText.length / 4);
    
    return {
      timeToFirstToken: executionTracking.timeToFirstToken,
      elapsedTime,
      tokens: tokenCount,
    };
  }
);

/**
 * Check if instance is ready to execute
 */
export const selectIsReadyToExecute = createSelector(
  [
    (state: RootState, runId: string) => selectInstance(state, runId),
    (state: RootState, runId: string) => {
      const instance = selectInstance(state, runId);
      return instance ? selectCachedPrompt(state, instance.promptId) : null;
    },
  ],
  (instance, prompt) => {
    if (!instance || !prompt) return false;
    if (instance.status === 'executing' || instance.status === 'streaming') return false;
    
    // Check if required variables are filled
    const requiredVars = prompt.variableDefaults?.filter(v => v.required) || [];
    const mergedVars = { ...instance.variables.userValues };
    
    return requiredVars.every(v => {
      const value = mergedVars[v.name];
      return value !== undefined && value !== null && value.trim() !== '';
    });
  }
);

/**
 * Get model configuration for execution
 */
export const selectModelConfig = createSelector(
  [
    (state: RootState, runId: string) => selectInstance(state, runId),
  ],
  (instance) => {
    if (!instance) return null;
    
    const { model_id, ...config } = instance.settings;
    
    return {
      modelId: model_id,
      config,
    };
  }
);

/**
 * Check if instance has unsaved changes
 * Uses isolated currentInput for efficient checking
 */
export const selectHasUnsavedChanges = createSelector(
  [
    (state: RootState, runId: string) => selectMessages(state, runId),
    (state: RootState, runId: string) => selectRunTracking(state, runId),
    (state: RootState, runId: string) => selectCurrentInput(state, runId),
  ],
  (messages, runTracking, currentInput) => {
    if (!runTracking) return false;
    
    // Has messages but not saved to database
    if (messages.length > 0 && !runTracking.savedToDatabase) {
      return true;
    }
    
    // Has input being typed
    if (currentInput.trim()) {
      return true;
    }
    
    return false;
  }
);

/**
 * Check if instance is executing or streaming
 */
export const selectIsExecuting = createSelector(
  [
    (state: RootState, runId: string) => selectInstanceStatus(state, runId),
  ],
  (status) => status === 'executing' || status === 'streaming'
);

/**
 * Check if instance is streaming
 */
export const selectIsStreaming = createSelector(
  [
    (state: RootState, runId: string) => selectInstanceStatus(state, runId),
  ],
  (status) => status === 'streaming'
);

/**
 * Check if instance has error
 */
export const selectHasError = createSelector(
  [
    (state: RootState, runId: string) => selectInstanceStatus(state, runId),
  ],
  (status) => status === 'error'
);

/**
 * Get expanded variable from UI state
 */
export const selectExpandedVariable = createSelector(
  [
    (state: RootState, runId: string) => selectUIState(state, runId),
  ],
  (uiState) => uiState.expandedVariable
);

/**
 * Get show variables from UI state
 */
export const selectShowVariables = createSelector(
  [
    (state: RootState, runId: string) => selectUIState(state, runId),
  ],
  (uiState) => uiState.showVariables
);
