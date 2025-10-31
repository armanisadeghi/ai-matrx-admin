/**
 * usePromptExecution Hook
 * 
 * Simple hook for executing prompts programmatically using Socket.IO
 * Pattern matches PromptRunner - dispatch task, watch selectors
 */

"use client";

import { useState, useCallback, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux';
import { createAndSubmitTask } from '@/lib/redux/socket-io/thunks/submitTaskThunk';
import { selectPrimaryResponseTextByTaskId, selectPrimaryResponseEndedByTaskId } from '@/lib/redux/socket-io/selectors/socket-response-selectors';
import { createClient } from '@/utils/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { PromptExecutionConfig, ExecutionResult } from '../types/execution';

export function usePromptExecution() {
  const dispatch = useAppDispatch();
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Watch streaming text for current task
  const streamingText = useAppSelector(state => 
    currentTaskId ? selectPrimaryResponseTextByTaskId(currentTaskId)(state) : ''
  );
  
  const isResponseEnded = useAppSelector(state =>
    currentTaskId ? selectPrimaryResponseEndedByTaskId(currentTaskId)(state) : false
  );


  // Reset when response ends
  useEffect(() => {
    if (isResponseEnded && isExecuting) {
      setIsExecuting(false);
    }
  }, [isResponseEnded, isExecuting]);

  const execute = useCallback(async (config: PromptExecutionConfig): Promise<ExecutionResult> => {
    setIsExecuting(true);
    setError(null);

    try {
      // 1. Fetch prompt data
      const supabase = createClient();
      const { data: prompt, error: promptError } = await supabase
        .from('prompts')
        .select('*')
        .eq('id', config.promptId)
        .single();

      if (promptError || !prompt) {
        throw new Error('Prompt not found');
      }

      // 2. Replace variables in messages
      const messages = prompt.messages.map((msg: any) => {
        let content = msg.content;
        
        // Replace variables
        if (config.variables) {
          Object.entries(config.variables).forEach(([key, source]) => {
            const value = source.type === 'hardcoded' ? source.value : '';
            content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
          });
        }
        
        return {
          role: msg.role,
          content
        };
      });

      // 3. Build chat config
      const modelId = prompt.settings?.model_id || config.modelConfig?.modelId;
      if (!modelId) {
        throw new Error('No model specified');
      }

      const chatConfig = {
        model_id: modelId,
        messages,
        stream: true,
        ...prompt.settings,
        ...config.modelConfig
      };

      // 4. Submit task via Socket.IO (exactly like PromptRunner)
      const taskId = uuidv4();
      setCurrentTaskId(taskId);

      const result = await dispatch(createAndSubmitTask({
        service: 'chat_service',
        taskName: 'direct_chat',
        taskData: { chat_config: chatConfig },
        customTaskId: taskId
      })).unwrap();

      // Return immediately - streaming will happen via selectors
      // The component will watch streamingText via the selector
      return {
        success: true,
        text: '', // Will be populated via streaming
        metadata: {
          promptId: config.promptId,
          promptName: prompt.name,
          taskId,
          duration: 0
        },
        resolvedVariables: {}
      };

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      setIsExecuting(false);
      config.onError?.({ stage: 'execution', message: errorMsg, details: err });
      
      return {
        success: false,
        text: '',
        metadata: { promptId: config.promptId, promptName: '', taskId: '', duration: 0 },
        error: { stage: 'execution', message: errorMsg, details: err },
        resolvedVariables: {}
      };
    }
  }, [dispatch]);

  return {
    execute,
    isExecuting,
    streamingText,
    error,
    currentTaskId, // Expose taskId for components that need it
    reset: () => {
      setIsExecuting(false);
      setCurrentTaskId(null);
      setError(null);
    }
  };
}
