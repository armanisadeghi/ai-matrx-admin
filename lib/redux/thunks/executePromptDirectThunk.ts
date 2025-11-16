/**
 * executePromptDirectThunk.ts
 * 
 * Direct prompt execution for non-UI display types (direct, background, inline, toast).
 * Returns the complete response without UI rendering.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import type { PromptData } from '@/features/prompts/types/modal';
import { createAndSubmitTask } from '../socket-io/thunks/submitTaskThunk';
import { selectPrimaryResponseTextByTaskId, selectPrimaryResponseEndedByTaskId } from '../socket-io/selectors/socket-response-selectors';
import { replaceVariablesInText } from '@/features/prompts/utils/variable-resolver';

export interface ExecutePromptDirectPayload {
  promptData: PromptData;
  variables?: Record<string, string>;
  initialMessage?: string;
  modelOverrides?: Record<string, any>;
}

export interface ExecutePromptDirectResult {
  response: string;
  taskId: string;
  metadata?: {
    tokens?: number;
    timeToFirstToken?: number;
    totalTime?: number;
  };
}

export const executePromptDirect = createAsyncThunk(
  'promptExecution/executeDirect',
  async (payload: ExecutePromptDirectPayload, { dispatch, getState }): Promise<ExecutePromptDirectResult> => {
    const { promptData, variables = {}, initialMessage, modelOverrides } = payload;
    const startTime = performance.now();
    
    // Step 1: Replace variables in messages
    const messagesWithVariables = (promptData.messages || []).map(msg => ({
      ...msg,
      content: replaceVariablesInText(msg.content, variables)
    }));
    
    // Step 2: Add initial message if provided
    const finalMessages = initialMessage
      ? [...messagesWithVariables, { role: 'user' as const, content: initialMessage }]
      : messagesWithVariables;
    
    // Step 3: Build chat config
    const chatConfig: Record<string, any> = {
      model_id: promptData.settings?.model_id,
      messages: finalMessages,
      stream: true,
      ...promptData.settings,
      ...modelOverrides,
    };
    
    // Step 4: Submit task via Socket.IO
    const result = await dispatch(createAndSubmitTask({
      service: 'chat_service',
      taskName: 'direct_chat',
      taskData: {
        chat_config: chatConfig
      }
    })).unwrap();
    
    const taskId = result.taskId;
    let timeToFirstToken: number | undefined;
    let firstTokenReceived = false;
    
    // Step 5: Wait for streaming to complete
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const state = getState() as RootState;
        const streamingText = selectPrimaryResponseTextByTaskId(taskId)(state);
        const isEnded = selectPrimaryResponseEndedByTaskId(taskId)(state);
        
        // Track time to first token
        if (!firstTokenReceived && streamingText && streamingText.length > 0) {
          firstTokenReceived = true;
          timeToFirstToken = Math.round(performance.now() - startTime);
        }
        
        // Check if response ended
        if (isEnded) {
          clearInterval(checkInterval);
          
          const totalTime = Math.round(performance.now() - startTime);
          const tokenCount = Math.round(streamingText.length / 4); // Rough estimate
          
          resolve({
            response: streamingText,
            taskId,
            metadata: {
              tokens: tokenCount,
              timeToFirstToken,
              totalTime,
            },
          });
        }
      }, 100); // Check every 100ms
      
      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Prompt execution timed out after 5 minutes'));
      }, 5 * 60 * 1000);
    });
  }
);

