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
  selectResources,
  selectDynamicContexts,
} from '../selectors';
import { createAndSubmitTask } from '../../socket-io/thunks/submitTaskThunk';
import { generateRunNameFromVariables, generateRunNameFromMessage } from '@/features/ai-runs/utils/name-generator';
import { createClient } from '@/utils/supabase/client';
import { processMessagesForExecution } from '../utils/message-builder';

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
  settings: Record<string, any>,
  dynamicContexts?: Record<string, any>
) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const insertData: Record<string, any> = {
      id: runId,
      user_id: user?.id,
      source_type: sourceType,
      source_id: sourceId,
      name: runName,
      messages,
      settings,
      variable_values: variables,
      status: 'active',
    };

    // Include dynamic contexts if they exist
    if (dynamicContexts && Object.keys(dynamicContexts).length > 0) {
      insertData.dynamic_contexts = dynamicContexts;
    }

    await supabase.from('ai_runs').insert(insertData);

    console.log('✅ Run saved to DB', dynamicContexts ? `(with ${Object.keys(dynamicContexts).length} contexts)` : '');
  } catch (err) {
    console.error('❌ DB save failed:', err);
  }
}

/**
 * Async DB update (non-blocking)
 */
async function updateRunMessagesInDBAsync(
  runId: string,
  messages: ConversationMessage[],
  dynamicContexts?: Record<string, any>
) {
  try {
    const supabase = createClient();
    
    const updateData: Record<string, any> = {
      messages,
      status: 'active',
    };

    // Include dynamic contexts if they exist
    if (dynamicContexts !== undefined) {
      updateData.dynamic_contexts = dynamicContexts;
    }

    await supabase.from('ai_runs')
      .update(updateData)
      .eq('id', runId);

    console.log('✅ Run updated in DB', dynamicContexts ? `(with ${Object.keys(dynamicContexts).length} contexts)` : '');
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

      // ========== GET RESOURCES AND CONTEXTS BEFORE CLEARING ==========
      const resources = selectResources(state, runId);
      const dynamicContexts = selectDynamicContexts(state, runId);
      const mergedVariables = selectMergedVariables(state, runId);

      // ========== PROCESS MESSAGES (CENTRALIZED) ==========
      // All message processing logic is now centralized in processMessagesForExecution
      const messageResult = await processMessagesForExecution({
        templateMessages: instance.messages,
        isFirstExecution: instance.requiresVariableReplacement,
        userInput: inputToUse.trim(),
        resources,
        variables: mergedVariables,
        dynamicContexts,
      });

      // CRITICAL: Only clear messages on FIRST execution
      // Subsequent executions must preserve conversation history!
      if (instance.requiresVariableReplacement) {
        // First execution: Replace template messages with processed versions
        dispatch(clearMessages({ runId }));
        messageResult.messages.forEach(msg => dispatch(addMessage({ runId, message: msg })));
        
        // Mark first execution as complete
        dispatch(setRequiresVariableReplacement({ runId, value: false }));
        dispatch(setShowVariables({ runId, show: false }));
      } else {
        // Subsequent executions: Append new message (preserve conversation history!)
        messageResult.messages.forEach(msg => dispatch(addMessage({ runId, message: msg })));
      }

      // Clear input and resources AFTER building the message
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
        const contextsToSave = selectDynamicContexts(getState(), runId);

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
          instance.settings,
          contextsToSave
        ).then(() => {
          dispatch(setRunId({ runId, runName, savedToDatabase: true }));
        });

      } else if (instance.runTracking.savedToDatabase) {
        // Subsequent message: update run
        const contextsToSave = selectDynamicContexts(getState(), runId);
        updateRunMessagesInDBAsync(runId, freshInstance.messages, contextsToSave);
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
