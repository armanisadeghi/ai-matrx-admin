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
} from '../slice';
import {
  selectInstance,
  selectMergedVariables,
  selectResolvedMessages,
  selectSystemMessage,
  selectConversationTemplate,
  selectModelConfig,
} from '../selectors';
import { createAndSubmitTask } from '../../socket-io/thunks/submitTaskThunk';
import { replaceVariablesInText } from '@/features/prompts/utils/variable-resolver';
import { generateRunNameFromVariables, generateRunNameFromMessage } from '@/features/ai-runs/utils/name-generator';
import { supabase } from '@/utils/supabase/client';

/**
 * Execute a message for a prompt instance
 * 
 * @example
 * ```typescript
 * await dispatch(executeMessage({
 *   instanceId: 'abc-123',
 *   userInput: 'Analyze this text', // optional
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
    const { instanceId, userInput } = payload;

    try {
      // ========== STEP 1: Get Fresh State ==========
      // CRITICAL: This reads current state, not captured closures!
      const state = getState();
      const instance = selectInstance(state, instanceId);
      
      if (!instance) {
        throw new Error(`Instance not found: ${instanceId}`);
      }
      
      if (instance.status === 'executing' || instance.status === 'streaming') {
        throw new Error('Instance is already executing');
      }
      
      // Update status
      dispatch(setInstanceStatus({ instanceId, status: 'executing' }));
      
      // ========== STEP 2: Build User Message ==========
      const isFirstMessage = instance.conversation.messages.length === 0;
      const conversationTemplate = selectConversationTemplate(state, instanceId);
      const lastTemplateMessage = conversationTemplate[conversationTemplate.length - 1];
      const isLastMessageUser = lastTemplateMessage?.role === 'user';
      
      let userMessageContent: string;
      
      if (isFirstMessage && isLastMessageUser) {
        // First message: Combine template with current input
        const templateContent = lastTemplateMessage.content;
        const currentInput = userInput || instance.conversation.currentInput;
        
        userMessageContent = currentInput.trim()
          ? `${templateContent}\n${currentInput}`
          : templateContent;
      } else {
        // Subsequent messages: Just use input
        userMessageContent = userInput || instance.conversation.currentInput;
      }
      
      if (!userMessageContent.trim()) {
        throw new Error('No message content to send');
      }
      
      // ========== STEP 3: Replace Variables ==========
      // CRITICAL: Gets FRESH merged variables from Redux!
      // No closure over stale state possible!
      const mergedVariables = selectMergedVariables(state, instanceId);
      const userMessageWithVariables = replaceVariablesInText(
        userMessageContent,
        mergedVariables
      );
      
      // Add user message to conversation
      const userMessage: ConversationMessage = {
        role: 'user',
        content: userMessageWithVariables,
        timestamp: new Date().toISOString(),
      };
      
      dispatch(addMessage({ instanceId, message: userMessage }));
      
      // ========== STEP 4: Create Run if First Message ==========
      let currentRunId = instance.runTracking.runId;
      
      if (isFirstMessage && !currentRunId && instance.executionConfig.track_in_runs) {
        // Generate run name
        const runName = generateRunNameFromVariables(mergedVariables, [])
          || generateRunNameFromMessage(userMessageWithVariables);
        
        // Create run in database
        const { data: run, error: runError } = await supabase
          .from('ai_runs')
          .insert({
            user_id: (await supabase.auth.getUser()).data.user?.id,
            source_type: instance.runTracking.sourceType,
            source_id: instance.runTracking.sourceId,
            name: runName,
            settings: instance.settings,
            variable_values: mergedVariables,
            messages: [userMessage],
            status: 'active',
          })
          .select()
          .single();
        
        if (runError || !run) {
          console.error('Failed to create run:', runError);
          throw new Error('Failed to create run');
        }
        
        currentRunId = run.id;
        dispatch(setRunId({ instanceId, runId: run.id, runName }));
        
        console.log('✅ Run created:', run.id, '-', runName);
      }
      
      // ========== STEP 5: Build Messages for API ==========
      // CRITICAL: Uses selector that reads fresh state!
      // Get fresh state again (may have changed after run creation)
      const currentState = getState();
      const systemMessage = selectSystemMessage(currentState, instanceId);
      
      let messagesToSend;
      
      if (isFirstMessage && isLastMessageUser) {
        // Replace last template message with combined content
        const templatesWithoutLast = conversationTemplate.slice(0, -1);
        messagesToSend = [
          ...templatesWithoutLast,
          { role: 'user' as const, content: userMessageContent },
        ];
      } else if (isFirstMessage) {
        // Append user message to templates
        messagesToSend = [
          ...conversationTemplate,
          { role: 'user' as const, content: userMessageContent },
        ];
      } else {
        // Use conversation history
        messagesToSend = instance.conversation.messages.map(m => ({
          role: m.role,
          content: m.content,
        }));
      }
      
      // Add system message and replace variables in ALL messages
      const allMessages = [
        { role: 'system' as const, content: systemMessage },
        ...messagesToSend,
      ];
      
      // CRITICAL: Replace variables using FRESH state!
      const messagesWithVariablesReplaced = allMessages.map(msg => ({
        ...msg,
        content: replaceVariablesInText(msg.content, mergedVariables),
      }));
      
      // ========== STEP 6: Build Chat Config ==========
      const modelConfig = selectModelConfig(currentState, instanceId);
      
      if (!modelConfig) {
        throw new Error('Model configuration not found');
      }
      
      const chatConfig = {
        model_id: modelConfig.modelId,
        messages: messagesWithVariablesReplaced,
        stream: true,
        ...modelConfig.config,
      };
      
      // ========== STEP 7: Create Task in DB (if tracking) ==========
      const taskId = uuidv4();
      
      if (currentRunId) {
        try {
          await supabase
            .from('ai_tasks')
            .insert({
              task_id: taskId,
              run_id: currentRunId,
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
      
      // ========== STEP 8: Submit to Socket.IO ==========
      dispatch(startExecution({ instanceId, taskId }));
      
      const result = await dispatch(createAndSubmitTask({
        service: 'chat_service',
        taskName: 'direct_chat',
        taskData: {
          chat_config: chatConfig,
        },
        customTaskId: taskId,
      })).unwrap();
      
      console.log('✅ Message execution started:', {
        instanceId,
        taskId: result.taskId,
        runId: currentRunId,
      });
      
      return result.taskId;
      
    } catch (error) {
      console.error('❌ Failed to execute message:', error);
      
      dispatch(setInstanceStatus({
        instanceId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Execution failed',
      }));
      
      throw error;
    }
  }
);

