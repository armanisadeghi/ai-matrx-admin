/**
 * Complete Execution Thunk
 * 
 * Finalizes an execution when streaming completes:
 * 1. Adds assistant message to conversation
 * 2. Completes task in ai_tasks table
 * 3. Adds message to ai_runs table
 * 4. Updates instance state with final stats
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../../store';
import type { CompleteExecutionPayload, ConversationMessage } from '../types';
import {
  selectInstance,
  addMessage,
  completeExecution,
  setInstanceStatus,
} from '../slice';
import { createClient } from '@/utils/supabase/client';

export const completeExecutionThunk = createAsyncThunk<
  void,
  CompleteExecutionPayload & {
    responseText: string;
    timeToFirstToken?: number;
    totalTime: number;
  },
  {
    dispatch: AppDispatch;
    state: RootState;
  }
>(
  'promptExecution/completeExecution',
  async (payload, { dispatch, getState }) => {
    const { instanceId, responseText, timeToFirstToken, totalTime } = payload;

    try {
      const state = getState();
      const instance = selectInstance(state, instanceId);

      if (!instance) {
        throw new Error(`Instance not found: ${instanceId}`);
      }

      // Calculate stats
      const tokenCount = Math.round(responseText.length / 4);
      const stats = {
        timeToFirstToken,
        totalTime,
        tokens: tokenCount,
        cost: 0, // Server calculates actual cost
      };

      // Add assistant message to conversation
      const assistantMessage: ConversationMessage = {
        role: 'assistant',
        content: responseText,
        taskId: instance.execution.currentTaskId || undefined,
        timestamp: new Date().toISOString(),
        metadata: stats,
      };

      dispatch(addMessage({ instanceId, message: assistantMessage }));

      // Complete task in database if tracking
      if (instance.runTracking.runId && instance.execution.currentTaskId) {
        try {
          // Create fresh client to pick up current auth session
          const supabase = createClient();
          
          // Complete task
          const { error: taskError } = await supabase
            .from('ai_tasks')
            .update({
              response_text: responseText,
              tokens_total: tokenCount,
              time_to_first_token: timeToFirstToken,
              total_time: totalTime,
              status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('task_id', instance.execution.currentTaskId);

          if (taskError) {
            console.error('Error completing task:', taskError);
          }

          // Add assistant message to run
          const { error: updateError } = await supabase
            .from('ai_runs')
            .update({
              messages: [...instance.conversation.messages, assistantMessage],
              updated_at: new Date().toISOString(),
            })
            .eq('id', instance.runTracking.runId);

          if (updateError) {
            console.error('Error updating run messages:', updateError);
          }

          console.log('✅ Execution completed:', {
            instanceId,
            runId: instance.runTracking.runId,
            taskId: instance.execution.currentTaskId,
            tokens: tokenCount,
          });
        } catch (err) {
          console.error('❌ Error saving to database:', err);
        }
      }

      // Update instance state
      dispatch(completeExecution({ instanceId, stats }));

    } catch (error) {
      console.error('❌ Failed to complete execution:', error);

      dispatch(setInstanceStatus({
        instanceId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Completion failed',
      }));

      throw error;
    }
  }
);

