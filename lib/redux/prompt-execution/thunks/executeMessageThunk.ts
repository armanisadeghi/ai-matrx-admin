/**
 * Execute Message Thunk
 * 
 * THE SINGLE EXECUTION ENGINE for all prompts.
 * 
 * This thunk:
 * 1. Gets fresh state from Redux (NO CLOSURE BUGS!)
 * 2. Uses selectors for variable replacement (CENTRALIZED!)
 * 3. Builds messages from current state
 * 4. Creates run if needed (track_in_runs: true)
 * 5. Submits to socket.io
 * 6. Updates instance state
 * 
 * CRITICAL: All variable resolution happens through Redux selectors,
 * which always read fresh state. This eliminates the closure bug that
 * caused variables to use stale values.
 * 
 * NOTE: Uses isolated state maps:
 * - currentInputs[runId] for user's typed input
 * - messages array directly on instance (not nested)
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { RootState, AppDispatch } from '../../store';
import type { ExecuteMessagePayload, ConversationMessage } from '../types';
import {
  addMessage,
  startExecution,
  setRunId,
  setInstanceStatus,
  clearCurrentInput,
} from '../slice';
import {
  selectInstance,
  selectCurrentInput,
  selectMergedVariables,
  selectSystemMessage,
  selectConversationTemplate,
  selectModelConfig,
  selectResources,
} from '../selectors';
import { createAndSubmitTask } from '../../socket-io/thunks/submitTaskThunk';
import { replaceVariablesInText } from '@/features/prompts/utils/variable-resolver';
import { generateRunNameFromVariables, generateRunNameFromMessage } from '@/features/ai-runs/utils/name-generator';
import { createClient } from '@/utils/supabase/client';
import { buildFinalMessage } from '../utils/message-builder';

/**
 * Execute a message for a prompt instance
 * 
 * @example
 * ```typescript
 * await dispatch(executeMessage({
 *   runId: 'abc-123',
 *   userInput: 'Analyze this text', // optional - uses currentInput from state if not provided
 * })).unwrap();
 * ```
 */
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
      // ========== STEP 1: Get Fresh State ==========
      // CRITICAL: This reads current state, not captured closures!
      const state = getState();
      const instance = selectInstance(state, runId);
      
      if (!instance) {
        throw new Error(`Instance not found: ${runId}`);
      }
      
      if (instance.status === 'executing' || instance.status === 'streaming') {
        throw new Error('Instance is already executing');
      }
      
      // Update status
      dispatch(setInstanceStatus({ runId, status: 'executing' }));
      
      // ========== STEP 2: Build User Message ==========
      // Get current input from ISOLATED state map
      const currentInput = selectCurrentInput(state, runId);
      const inputToUse = userInput || currentInput;
      
      if (!inputToUse.trim() && instance.messages.length > 0) {
        throw new Error('No message content to send');
      }
      
      const isFirstMessage = instance.messages.length === 0;
      const conversationTemplate = selectConversationTemplate(state, runId);
      const lastTemplateMessage = conversationTemplate[conversationTemplate.length - 1];
      const isLastMessageUser = lastTemplateMessage?.role === 'user';
      
      // Get resources and variables from state
      const resources = selectResources(state, runId);
      const mergedVariables = selectMergedVariables(state, runId);
      
      // Build the final message using shared utility
      // This ensures debug component shows EXACTLY what will be sent
      console.log('🔨 Building message:', {
        isFirstMessage,
        isLastMessageUser,
        hasTemplate: !!lastTemplateMessage,
        resourceCount: resources.length,
        variableCount: Object.keys(mergedVariables).length,
      });
      
      const messageResult = await buildFinalMessage({
        isFirstMessage,
        isLastTemplateMessageUser: isLastMessageUser,
        lastTemplateMessage,
        userInput: inputToUse,
        resources,
        variables: mergedVariables,
      });
      
      const userMessageWithVariables = messageResult.finalContent;
      
      console.log('✅ Message built:', {
        finalLength: userMessageWithVariables.length,
        baseLength: messageResult.baseContent.length,
        hasResources: messageResult.hasResources,
        resourceXmlLength: messageResult.resourcesXml.length,
      });
      
      // Add user message to conversation
      const userMessage: ConversationMessage = {
        role: 'user',
        content: userMessageWithVariables,
        timestamp: new Date().toISOString(),
      };
      
      dispatch(addMessage({ runId, message: userMessage }));
      
      // Clear the input field (isolated state map)
      dispatch(clearCurrentInput({ runId }));
      
      // ========== STEP 5: Save Run to Database if First Message ==========
      if (isFirstMessage && !instance.runTracking.savedToDatabase && instance.executionConfig.track_in_runs) {
        // Generate run name
        const runName = generateRunNameFromVariables(mergedVariables, [])
          || generateRunNameFromMessage(userMessageWithVariables);
        
        // Create fresh client to pick up current auth session
        const supabase = createClient();
        
        // Save run to database with our runId
        const { error: runError } = await supabase
          .from('ai_runs')
          .insert({
            id: runId, // Use the instance runId as the database ID
            user_id: (await supabase.auth.getUser()).data.user?.id,
            source_type: instance.runTracking.sourceType,
            source_id: instance.runTracking.sourceId,
            name: runName,
            settings: instance.settings,
            variable_values: mergedVariables,
            messages: [userMessage],
            status: 'active',
          });
        
        if (runError) {
          console.error('Failed to save run to database:', runError);
          throw new Error('Failed to save run to database');
        }
        
        // Update run tracking
        dispatch(setRunId({ runId, runName, savedToDatabase: true }));
        
        console.log('✅ Run saved to database:', runId, '-', runName);
      }
      
      // ========== STEP 6: Build Messages for API ==========
      // CRITICAL: Uses selector that reads fresh state!
      // Get fresh state again (may have changed after run creation)
      const currentState = getState();
      const systemMessage = selectSystemMessage(currentState, runId);
      
      let messagesToSend;
      
      if (isFirstMessage && isLastMessageUser) {
        // Replace last template message with combined content (with variables already replaced)
        const templatesWithoutLast = conversationTemplate.slice(0, -1);
        messagesToSend = [
          ...templatesWithoutLast,
          { role: 'user' as const, content: userMessageWithVariables },
        ];
      } else if (isFirstMessage) {
        // Append user message to templates (with variables already replaced)
        messagesToSend = [
          ...conversationTemplate,
          { role: 'user' as const, content: userMessageWithVariables },
        ];
      } else {
        // Use conversation history (from instance.messages directly)
        // The user message with variables is already added to instance.messages above
        messagesToSend = instance.messages.map(m => ({
          role: m.role,
          content: m.content,
        }));
      }
      
      // Add system message and replace variables in template messages only
      // Note: User message already has variables replaced (userMessageWithVariables)
      const allMessages = [
        { role: 'system' as const, content: systemMessage },
        ...messagesToSend,
      ];
      
      // CRITICAL: Replace variables in template messages only!
      // User messages in messagesToSend already have variables replaced
      const messagesWithVariablesReplaced = allMessages.map((msg, index) => {
        // System message always needs variable replacement
        if (msg.role === 'system') {
          return {
            ...msg,
            content: replaceVariablesInText(msg.content, mergedVariables),
          };
        }
        
        // For first message scenarios, the last message is the user message with variables already replaced
        if (isFirstMessage && index === allMessages.length - 1 && msg.role === 'user') {
          return msg; // Already has variables replaced
        }
        
        // For subsequent messages, messages from instance.messages already have variables replaced
        if (!isFirstMessage) {
          return msg; // Already has variables replaced
        }
        
        // Template messages (assistant prompts, etc.) need variable replacement
        return {
          ...msg,
          content: replaceVariablesInText(msg.content, mergedVariables),
        };
      });
      
      // ========== STEP 7: Build Chat Config ==========
      const modelConfig = selectModelConfig(currentState, runId);
      
      if (!modelConfig) {
        throw new Error('Model configuration not found');
      }
      
      const chatConfig = {
        model_id: modelConfig.modelId,
        messages: messagesWithVariablesReplaced,
        stream: true,
        ...modelConfig.config,
      };
      
      // ========== STEP 8: Create Task in DB (if tracking) ==========
      const taskId = uuidv4();
      
      if (instance.runTracking.savedToDatabase) {
        try {
          const supabase = createClient();
          await supabase
            .from('ai_tasks')
            .insert({
              task_id: taskId,
              run_id: runId,
              service: 'chat_service',
              task_name: 'direct_chat',
              model_id: modelConfig.modelId,
              request_data: chatConfig,
              status: 'pending',
            });
          
          console.log('✅ Task created:', taskId);
        } catch (err) {
          console.error('❌ Error creating task:', err);
        }
      }
      
      // ========== STEP 9: Submit to Socket.IO ==========
      dispatch(startExecution({ runId, taskId }));
      
      const result = await dispatch(createAndSubmitTask({
        service: 'chat_service',
        taskName: 'direct_chat',
        taskData: {
          chat_config: chatConfig,
        },
        customTaskId: taskId,
      })).unwrap();
      
      console.log('✅ Message execution started:', {
        runId,
        taskId: result.taskId,
      });
      
      return result.taskId;
      
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
