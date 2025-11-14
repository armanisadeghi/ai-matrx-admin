/**
 * usePromptExecution Hook
 * 
 * Comprehensive hook for executing prompts programmatically using Socket.IO
 * 
 * Features:
 * - Accept either promptId (fetch from DB) or promptData object (skip fetch)
 * - Support all variable source types (hardcoded, runtime, functions, etc.)
 * - Flexible variable formats: simple strings, full format, or mixed
 * - Handle user input / initial message
 * - Model config overrides
 * - Real-time streaming via Socket.IO
 * - Progress tracking and error handling
 * 
 * @example
 * ```tsx
 * const { execute, streamingText, isExecuting } = usePromptExecution();
 * 
 * // Simplest format - just strings (recommended)
 * execute({
 *   promptData: myPromptObject,
 *   variables: {
 *     selected_text: "Your text here",
 *     expansion_style: "Comprehensive - Add extensive detail"
 *   }
 * });
 * 
 * // Full format (explicit control)
 * execute({
 *   promptId: 'my-prompt-id',
 *   variables: { 
 *     name: { type: 'hardcoded', value: 'John' } 
 *   },
 *   userInput: 'Additional context here'
 * });
 * 
 * // Mixed format (best of both worlds)
 * execute({
 *   promptData: myPromptObject,
 *   variables: {
 *     selected_text: "Some text", // Simple
 *     timestamp: { type: 'runtime', getValue: () => new Date().toISOString() } // Advanced
 *   }
 * });
 * ```
 */

"use client";

import { useState, useCallback, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux';
import { createAndSubmitTask } from '@/lib/redux/socket-io/thunks/submitTaskThunk';
import { selectPrimaryResponseTextByTaskId, selectPrimaryResponseEndedByTaskId } from '@/lib/redux/socket-io/selectors/socket-response-selectors';
import { supabase } from '@/utils/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { PromptExecutionConfig, ExecutionResult, PromptExecutionData, UsePromptExecutionReturn } from '../types/execution';
import { resolveVariables, extractVariablesFromMessages } from '../utils/variable-resolver';

export function usePromptExecution(): UsePromptExecutionReturn {
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
    const startTime = performance.now();
    setIsExecuting(true);
    setError(null);

    try {
      // Validate config
      if (!config.promptId && !config.promptData) {
        throw new Error('Either promptId or promptData must be provided');
      }

      // === 1. Get Prompt Data (fetch or use provided) ===
      let promptData: PromptExecutionData;
      
      if (config.promptData) {
        // Use provided prompt data (skip fetch)
        // Extract variables from messages if not already provided
        const messages = config.promptData.messages || [];
        const variables = ('variables' in config.promptData && config.promptData.variables) 
          ? config.promptData.variables 
          : extractVariablesFromMessages(messages);
        
        promptData = {
          id: config.promptData.id || '',
          name: config.promptData.name || 'Unnamed Prompt',
          messages,
          variables,
          settings: config.promptData.settings || {},
          variableDefaults: config.promptData.variableDefaults || []
        };
      } else if (config.promptId) {
        // Fetch from database
        const { data: prompt, error: promptError } = await supabase
          .from('prompts')
          .select('*')
          .eq('id', config.promptId)
          .single();

        if (promptError || !prompt) {
          throw new Error('Prompt not found');
        }

        const variables = extractVariablesFromMessages(prompt.messages || []);
        promptData = {
          id: prompt.id,
          name: prompt.name,
          messages: prompt.messages || [],
          variables,
          settings: prompt.settings || {},
          variableDefaults: prompt.variable_defaults || []
        };
      } else {
        throw new Error('Either promptId or promptData must be provided');
      }

      // === 2. Normalize Variables (convert simple format to full format) ===
      let normalizedVariables = config.variables;
      
      if (config.variables) {
        normalizedVariables = {};
        
        Object.entries(config.variables).forEach(([key, value]) => {
          // If already in full format { type: 'hardcoded', value: 'x' }, keep it
          if (typeof value === 'object' && value !== null && 'type' in value) {
            normalizedVariables![key] = value;
          } 
          // If simple format (just a string), convert it to hardcoded
          else if (typeof value === 'string') {
            normalizedVariables![key] = { type: 'hardcoded', value };
          }
          // Otherwise keep as-is (for function/runtime variables or other formats)
          else {
            normalizedVariables![key] = value;
          }
        });
      }

      // === 3. Resolve Variables ===
      let resolvedVariables: Record<string, string> = {};
      
      if (normalizedVariables && promptData.variables.length > 0) {
        const { values, errors } = await resolveVariables(
          promptData.variables,
          normalizedVariables,
          config.context
        );
        
        resolvedVariables = values;
        
        // Log variable resolution errors (but continue execution)
        if (Object.keys(errors).length > 0) {
          console.warn('Variable resolution errors:', errors);
        }
      }

      // === 4. Build Messages with Variable Substitution ===
      let messages = promptData.messages.map((msg: any) => {
        let content = msg.content;
        
        // Replace all variables in content
        Object.entries(resolvedVariables).forEach(([key, value]) => {
          const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
          content = content.replace(regex, value);
        });
        
        return {
          role: msg.role,
          content,
          ...(msg.metadata && { metadata: msg.metadata })
        };
      });

      // === 5. Add User Input / Initial Message ===
      if (config.userInput) {
        const userInputContent = typeof config.userInput === 'function' 
          ? await config.userInput() 
          : config.userInput;
        
        if (userInputContent && userInputContent.trim()) {
          messages.push({
            role: 'user',
            content: userInputContent.trim(),
            metadata: {}
          });
        }
      }

      // === 6. Build Chat Config with Model Overrides ===
      const modelId = config.modelConfig?.modelId 
        || config.modelConfig?.model_id 
        || promptData.settings?.model_id;
        
      if (!modelId) {
        throw new Error('No model specified');
      }

      // Merge settings: prompt settings < config overrides
      const chatConfig: Record<string, any> = {
        model_id: modelId,
        messages,
        stream: true,
        ...promptData.settings,
        ...config.modelConfig
      };

      // Normalize property names (handle both camelCase and snake_case)
      if (config.modelConfig) {
        if (config.modelConfig.maxTokens) chatConfig.max_tokens = config.modelConfig.maxTokens;
        if (config.modelConfig.max_tokens) chatConfig.max_tokens = config.modelConfig.max_tokens;
      }

      // === 7. Submit Task via Socket.IO ===
      const taskId = uuidv4();
      setCurrentTaskId(taskId);

      await dispatch(createAndSubmitTask({
        service: 'chat_service',
        taskName: 'direct_chat',
        taskData: { chat_config: chatConfig },
        customTaskId: taskId
      })).unwrap();

      // === 8. Return Result (streaming happens via selectors) ===
      const duration = Math.round(performance.now() - startTime);
      
      return {
        success: true,
        text: '', // Will be populated via streaming (watch streamingText)
        metadata: {
          promptId: promptData.id,
          promptName: promptData.name,
          taskId,
          duration,
          model: modelId
        },
        resolvedVariables
      };

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      const duration = Math.round(performance.now() - startTime);
      
      setError(errorMsg);
      setIsExecuting(false);
      
      // Call error callback if provided
      config.onError?.({ stage: 'execution', message: errorMsg, details: err });
      
      return {
        success: false,
        text: '',
        metadata: { 
          promptId: config.promptId || config.promptData?.id || '', 
          promptName: config.promptData?.name || '', 
          taskId: '', 
          duration 
        },
        error: { stage: 'execution', message: errorMsg, details: err },
        resolvedVariables: {}
      };
    }
  }, [dispatch]);

  return {
    execute,
    isExecuting,
    streamingText,
    currentTaskId,
    isResponseEnded,
    error,
    reset: () => {
      setIsExecuting(false);
      setCurrentTaskId(null);
      setError(null);
    }
  };
}

/**
 * Convenience function to create a simple hardcoded variable map
 * 
 * @example
 * ```tsx
 * const variables = createSimpleVariables({
 *   name: 'John',
 *   age: '25',
 *   topic: 'AI'
 * });
 * 
 * execute({ promptId: 'my-prompt', variables });
 * ```
 */
export function createSimpleVariables(values: Record<string, string>) {
  const variables: Record<string, { type: 'hardcoded'; value: string }> = {};
  
  Object.entries(values).forEach(([key, value]) => {
    variables[key] = { type: 'hardcoded', value };
  });
  
  return variables;
}

/**
 * Convenience function to create a runtime variable (lazy evaluation)
 * 
 * @example
 * ```tsx
 * const variables = {
 *   timestamp: createRuntimeVariable(() => new Date().toISOString()),
 *   randomId: createRuntimeVariable(() => Math.random().toString())
 * };
 * ```
 */
export function createRuntimeVariable(getValue: () => string | Promise<string>) {
  return { type: 'runtime' as const, getValue };
}

/**
 * Convenience function to create a function-based variable with context
 * 
 * @example
 * ```tsx
 * const variables = {
 *   userName: createFunctionVariable((ctx) => ctx.user.name),
 *   selection: createFunctionVariable((ctx) => ctx.selectedText)
 * };
 * 
 * execute({ 
 *   promptId: 'my-prompt', 
 *   variables,
 *   context: { user: { name: 'John' }, selectedText: 'Hello' }
 * });
 * ```
 */
export function createFunctionVariable(fn: (context?: any) => string | Promise<string>) {
  return { type: 'function' as const, fn };
}
