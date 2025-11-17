/**
 * Prompt Execution Selectors
 * 
 * Memoized selectors for computed values.
 * These prevent closure bugs by deriving values from fresh Redux state.
 */

import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import {
  selectInstance,
  selectScopedVariables,
} from './slice';
import { selectCachedPrompt } from '../slices/promptCacheSlice';
import {
  selectPrimaryResponseTextByTaskId,
  selectPrimaryResponseEndedByTaskId,
} from '../socket-io/selectors/socket-response-selectors';
import { replaceVariablesInText } from '@/features/prompts/utils/variable-resolver';

// Re-export selectInstance for convenience
export { selectInstance } from './slice';

/**
 * Get merged variables for an instance
 * Priority: computedValues > userValues > scopedValues > promptDefaults
 * 
 * This is the SINGLE SOURCE OF TRUTH for variable values.
 * No closure bugs possible - always derived from current state.
 */
export const selectMergedVariables = createSelector(
  [
    (state: RootState, instanceId: string) => selectInstance(state, instanceId),
    (state: RootState) => selectScopedVariables(state),
    (state: RootState, instanceId: string) => {
      const instance = selectInstance(state, instanceId);
      return instance ? selectCachedPrompt(state, instance.promptId) : null;
    },
  ],
  (instance, scopedVariables, prompt) => {
    if (!instance) return {};
    
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
      ...(scopedVariables.user || {}),
      ...(scopedVariables.org || {}),
      ...(scopedVariables.project || {}),
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
    (state: RootState, instanceId: string) => {
      const instance = selectInstance(state, instanceId);
      return instance ? selectCachedPrompt(state, instance.promptId) : null;
    },
  ],
  (prompt) => {
    return prompt?.messages || [];
  }
);

/**
 * Get conversation messages (user/assistant exchange)
 */
export const selectConversationMessages = createSelector(
  [
    (state: RootState, instanceId: string) => selectInstance(state, instanceId),
  ],
  (instance) => {
    return instance?.conversation.messages || [];
  }
);

/**
 * Get ALL messages with variables replaced
 * This is what gets sent to the API
 * 
 * CRITICAL: This selector eliminates the closure bug because:
 * 1. It's a pure function of Redux state
 * 2. It recomputes when dependencies change
 * 3. No captured closures over stale state
 */
export const selectResolvedMessages = createSelector(
  [
    (state: RootState, instanceId: string) => selectTemplateMessages(state, instanceId),
    (state: RootState, instanceId: string) => selectConversationMessages(state, instanceId),
    (state: RootState, instanceId: string) => selectMergedVariables(state, instanceId),
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
    (state: RootState, instanceId: string) => selectTemplateMessages(state, instanceId),
    (state: RootState, instanceId: string) => selectMergedVariables(state, instanceId),
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
    (state: RootState, instanceId: string) => selectTemplateMessages(state, instanceId),
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
    (state: RootState, instanceId: string) => {
      const instance = selectInstance(state, instanceId);
      return instance?.execution.currentTaskId;
    },
    (state: RootState, _instanceId: string) => state,
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
    (state: RootState, instanceId: string) => {
      const instance = selectInstance(state, instanceId);
      return instance?.execution.currentTaskId;
    },
    (state: RootState, _instanceId: string) => state,
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
    (state: RootState, instanceId: string) => selectConversationMessages(state, instanceId),
    (state: RootState, instanceId: string) => selectStreamingTextForInstance(state, instanceId),
    (state: RootState, instanceId: string) => {
      const instance = selectInstance(state, instanceId);
      return {
        taskId: instance?.execution.currentTaskId,
        isStreaming: instance?.status === 'streaming',
        messageStartTime: instance?.execution.messageStartTime,
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
    (state: RootState, instanceId: string) => selectInstance(state, instanceId),
  ],
  (instance) => {
    if (!instance) return null;
    
    return {
      messageCount: instance.conversation.messages.length,
      totalTokens: instance.runTracking.totalTokens,
      totalCost: instance.runTracking.totalCost,
      lastMessageStats: instance.execution.lastMessageStats,
      status: instance.status,
      hasRun: !!instance.runTracking.runId,
    };
  }
);

/**
 * Get live streaming stats
 */
export const selectLiveStreamingStats = createSelector(
  [
    (state: RootState, instanceId: string) => selectInstance(state, instanceId),
    (state: RootState, instanceId: string) => selectStreamingTextForInstance(state, instanceId),
  ],
  (instance, streamingText) => {
    if (
      !instance ||
      instance.status !== 'streaming' ||
      !instance.execution.messageStartTime
    ) {
      return null;
    }
    
    const currentTime = Date.now();
    const elapsedTime = currentTime - instance.execution.messageStartTime;
    const tokenCount = Math.round(streamingText.length / 4);
    
    return {
      timeToFirstToken: instance.execution.timeToFirstToken,
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
    (state: RootState, instanceId: string) => selectInstance(state, instanceId),
    (state: RootState, instanceId: string) => {
      const instance = selectInstance(state, instanceId);
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
    (state: RootState, instanceId: string) => selectInstance(state, instanceId),
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
 */
export const selectHasUnsavedChanges = createSelector(
  [
    (state: RootState, instanceId: string) => selectInstance(state, instanceId),
  ],
  (instance) => {
    if (!instance) return false;
    
    // Has messages but no run created
    if (instance.conversation.messages.length > 0 && !instance.runTracking.runId) {
      return true;
    }
    
    // Has input being typed
    if (instance.conversation.currentInput.trim()) {
      return true;
    }
    
    return false;
  }
);

