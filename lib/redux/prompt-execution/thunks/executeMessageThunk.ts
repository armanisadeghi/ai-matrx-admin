/**
 * Execute Message Thunk - REFACTORED
 * 
 * Simplified execution engine with clear separation:
 * - First execution: Apply variables to templates (flag-based)
 * - Subsequent: Simple append
 * - DB operations are NON-BLOCKING (fire-and-forget)
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { RootState, AppDispatch } from '../../store';
import type { ExecuteMessagePayload, ConversationMessage } from '../types';
import {
  addMessage,
  clearMessages,
  setRequiresVariableReplacement,
  startExecution,
  setRunId,
  setInstanceStatus,
  clearCurrentInput,
  clearResources,
  setShowVariables,
} from '../slice';
import {
  selectInstance,
  selectCurrentInput,
  selectMergedVariables,
  selectPromptSettings,
} from '../selectors';
import { createAndSubmitTask } from '../../socket-io/thunks/submitTaskThunk';
import { replaceVariablesInText } from '@/features/prompts/utils/variable-resolver';
import { generateRunNameFromVariables, generateRunNameFromMessage } from '@/features/ai-runs/utils/name-generator';
import { createClient } from '@/utils/supabase/client';

/**
 * Async DB save (non-blocking)
 */
async function saveRunToDBAsync(
  runId: string,
  runName: string,
  messages: ConversationMessage[],
  variables: Record<string, string>,
  sourceType: string,
  sourceId: string,
  settings: Record<string, any>
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('ai_runs').insert({
      id: runId,
      user_id: user?.id,
      source_type: sourceType,
      source_id: sourceId,
      name: runName,
      messages,
      settings,
      variable_values: variables,
      status: 'active',
    });

    console.log('✅ Run saved to DB');
  } catch (err) {
    console.error('❌ DB save failed:', err);
  }
}

/**
 * Async DB update (non-blocking)
 */
async function updateRunMessagesInDBAsync(
  runId: string,
  messages: ConversationMessage[]
) {
  try {
    const supabase = createClient();
    await supabase.from('ai_runs')
      .update({ messages, status: 'active' })
      .eq('id', runId);

    console.log('✅ Run updated in DB');
  } catch (err) {
    console.error('❌ DB update failed:', err);
  }
}

export const executeMessage = createAsyncThunk<
  string, // Returns taskId
  ExecuteMessagePayload,
  {
    dispatch: AppDispatch;
    state: RootState;
  }
>(
  'promptExecution/executeMessage',
  async (payload, { dispatch, getState }) => {
    const { runId, userInput } = payload;

    try {
      // ========== VALIDATION ==========
      const state = getState();
      const instance = selectInstance(state, runId);

      if (!instance) {
        throw new Error(`Instance not found: ${runId}`);
      }

      if (instance.status === 'executing' || instance.status === 'streaming') {
        throw new Error('Instance is already executing');
      }

      const currentInput = selectCurrentInput(state, runId);
      const inputToUse = userInput || currentInput;

      if (!inputToUse.trim() && !instance.requiresVariableReplacement) {
        throw new Error('No message content');
      }

      dispatch(setInstanceStatus({ runId, status: 'executing' }));

      // ========== PROCESS MESSAGES ==========
      if (instance.requiresVariableReplacement) {
        // **FIRST EXECUTION**: Apply variables to templates
        const mergedVariables = selectMergedVariables(state, runId);

        const processedMessages = instance.messages.map(msg => ({
          role: msg.role,
          content: replaceVariablesInText(msg.content, mergedVariables),
          timestamp: new Date().toISOString(), // Add timestamp NOW
        }));

        // Handle last message (append user input if it's a user message)
        const lastMsg = processedMessages[processedMessages.length - 1];
        if (lastMsg?.role === 'user') {
          lastMsg.content = lastMsg.content + '\n\n' + inputToUse.trim();
        } else {
          // Add new user message
          processedMessages.push({
            role: 'user',
            content: inputToUse.trim(),
            timestamp: new Date().toISOString(),
          });
        }

        // Replace instance.messages with processed versions
        dispatch(clearMessages({ runId }));
        processedMessages.forEach(msg => dispatch(addMessage({ runId, message: msg })));
        dispatch(setRequiresVariableReplacement({ runId, value: false }));
        dispatch(setShowVariables({ runId, show: false }));

      } else {
        // **SUBSEQUENT EXECUTIONS**: Simple append
        const userMessage: ConversationMessage = {
          role: 'user',
          content: inputToUse.trim(),
          timestamp: new Date().toISOString(),
        };
        dispatch(addMessage({ runId, message: userMessage }));
      }

      // Clear input
      dispatch(clearCurrentInput({ runId }));
      dispatch(clearResources({ runId }));

      // ========== MAKE API CALL (PRIORITY!) ==========
      const freshState = getState();
      const freshInstance = selectInstance(freshState, runId);

      if (!freshInstance) {
        throw new Error('Instance lost after message processing');
      }

      const messagesToSend = freshInstance.messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const promptSettings = selectPromptSettings(freshState, runId);
      if (!promptSettings) {
        throw new Error('Prompt settings not found');
      }

      const chatConfig = {
        model_id: promptSettings.modelId,
        messages: messagesToSend,
        stream: true,
        ...promptSettings.config,
      };

      const taskId = uuidv4();
      dispatch(startExecution({ runId, taskId }));

      // Submit task - API call happens NOW
      const apiPromise = dispatch(createAndSubmitTask({
        service: 'chat_service',
        taskName: 'direct_chat',
        taskData: { chat_config: chatConfig },
        customTaskId: taskId,
      }));

      // ========== ASYNC: Database Operations (NON-BLOCKING) ==========
      // These happen after API call, don't block response

      if (instance.requiresVariableReplacement && instance.executionConfig.track_in_runs) {
        // First message: create run in DB
        const mergedVariables = selectMergedVariables(getState(), runId);

        // Try to generate name from variables first
        let runName = generateRunNameFromVariables(mergedVariables, instance.variableDefaults);

        // Fallback to message content if no suitable variable found
        if (!runName) {
          const firstUserMessage = freshInstance.messages.find(m => m.role === 'user');
          if (firstUserMessage) {
            runName = generateRunNameFromMessage(firstUserMessage.content);
          }
        }

        runName = runName || 'New Conversation';

        // Fire and forget - use runTracking values for correct source_type and source_id
        saveRunToDBAsync(
          runId,
          runName,
          freshInstance.messages,
          mergedVariables,
          instance.runTracking.sourceType,
          instance.runTracking.sourceId,
          instance.settings
        ).then(() => {
          dispatch(setRunId({ runId, runName, savedToDatabase: true }));
        });

      } else if (instance.runTracking.savedToDatabase) {
        // Subsequent message: update run
        updateRunMessagesInDBAsync(runId, freshInstance.messages);
      }

      // Return API promise
      await apiPromise.unwrap();
      return taskId;

    } catch (error) {
      console.error('❌ Failed to execute message:', error);

      dispatch(setInstanceStatus({
        runId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Execution failed',
      }));

      throw error;
    }
  }
);
