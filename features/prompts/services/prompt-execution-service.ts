/**
 * Prompt Execution Service
 * 
 * Core service for programmatically executing prompts from anywhere in the application.
 * Handles variable resolution, execution, and output processing.
 * 
 * Uses Socket.IO for execution (same as PromptRunner)
 */

import { createClient } from '@/utils/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import {
  PromptExecutionConfig,
  PromptExecutionData,
  ExecutionResult,
  ExecutionProgress,
  ExecutionError,
  OutputHandler
} from '../types/execution';
import {
  resolveVariables,
  replaceVariablesInText,
  extractVariablesFromMessages
} from '../utils/variable-resolver';
import { generateRunNameFromMessage } from '@/features/ai-runs/utils/name-generator';
import type { AppDispatch, RootState } from '@/lib/redux/store';

/**
 * PromptExecutionService
 * 
 * Provides methods to execute prompts programmatically with flexible
 * input sources and output handlers.
 * 
 * IMPORTANT: This needs Redux dispatch and uses Socket.IO for execution
 */
export class PromptExecutionService {
  private dispatch: AppDispatch | null = null;
  private getState: (() => RootState) | null = null;

  /**
   * Initialize with Redux store access
   */
  setStore(dispatch: AppDispatch, getState: () => RootState) {
    this.dispatch = dispatch;
    this.getState = getState;
  }

  /**
   * Execute a prompt with the given configuration
   */
  async execute(
    config: PromptExecutionConfig,
    onProgress?: (progress: ExecutionProgress) => void
  ): Promise<ExecutionResult> {
    if (!this.dispatch || !this.getState) {
      throw new Error('PromptExecutionService not initialized with Redux store');
    }

    const startTime = performance.now();
    let taskId = '';
    let runId: string | undefined;

    try {
      // 1. Initialize
      onProgress?.({
        status: 'initializing',
        message: 'Loading prompt...'
      });

      const promptData = await this.fetchPromptData(config.promptId);

      // 2. Resolve variables
      onProgress?.({
        status: 'resolving-variables',
        message: 'Resolving variables...'
      });

      const { resolvedVariables, userInput } = await this.resolveInputs(
        config,
        promptData
      );

      // 3. Build messages with replaced variables
      const messages = this.buildMessages(promptData, resolvedVariables, userInput);

      // 4. Execute via Socket.IO (same as PromptRunner)
      onProgress?.({
        status: 'executing',
        message: 'Sending request...'
      });

      const { text, metadata } = await this.executePromptViaSocket(
        messages,
        config,
        promptData,
        onProgress
      );

      taskId = metadata.taskId;
      runId = metadata.runId;

      // 5. Process output
      onProgress?.({
        status: 'processing-output',
        message: 'Processing response...'
      });

      await this.processOutput(config.output, text, metadata);

      // 6. Complete
      const duration = Math.round(performance.now() - startTime);

      onProgress?.({
        status: 'complete',
        message: 'Execution complete'
      });

      return {
        success: true,
        text,
        metadata: {
          ...metadata,
          promptId: config.promptId,
          promptName: promptData.name,
          duration
        },
        resolvedVariables
      };

    } catch (error) {
      const executionError: ExecutionError = {
        stage: 'execution',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error
      };

      config.onError?.(executionError);

      return {
        success: false,
        text: '',
        metadata: {
          promptId: config.promptId,
          promptName: '',
          taskId,
          runId,
          duration: Math.round(performance.now() - startTime)
        },
        error: executionError,
        resolvedVariables: {}
      };
    }
  }

  /**
   * Cancel current execution - not yet implemented for Socket.IO
   */
  cancel(): void {
    // TODO: Implement socket cancellation if needed
    console.warn('Cancel not yet implemented for Socket.IO execution');
  }

  /**
   * Fetch prompt data from database
   */
  private async fetchPromptData(promptId: string): Promise<PromptExecutionData> {
    const supabase = createClient();
    
    const { data: prompt, error } = await supabase
      .from('prompts')
      .select('id, name, messages, variable_defaults, settings')
      .eq('id', promptId)
      .single();

    if (error || !prompt) {
      throw new Error(`Failed to fetch prompt: ${error?.message || 'Not found'}`);
    }

    const variables = extractVariablesFromMessages(prompt.messages || []);

    return {
      id: prompt.id,
      name: prompt.name,
      messages: prompt.messages || [],
      variables,
      settings: prompt.settings || {},
      variableDefaults: prompt.variable_defaults || []
    };
  }

  /**
   * Resolve all inputs (variables and user input)
   */
  private async resolveInputs(
    config: PromptExecutionConfig,
    promptData: PromptExecutionData
  ): Promise<{ resolvedVariables: Record<string, string>; userInput: string }> {
    // Resolve variables
    const { values: resolvedVariables, errors } = await resolveVariables(
      promptData.variables,
      config.variables || {},
      config.context
    );

    if (Object.keys(errors).length > 0) {
      console.warn('Variable resolution errors:', errors);
    }

    // Resolve user input if provided
    let userInput = '';
    if (config.userInput) {
      if (typeof config.userInput === 'function') {
        userInput = await Promise.resolve(config.userInput());
      } else {
        userInput = config.userInput;
      }
    }

    return { resolvedVariables, userInput };
  }

  /**
   * Build final messages with variables replaced
   */
  private buildMessages(
    promptData: PromptExecutionData,
    resolvedVariables: Record<string, string>,
    userInput: string
  ): any[] {
    let messages = promptData.messages.map(msg => ({
      ...msg,
      content: replaceVariablesInText(msg.content, resolvedVariables)
    }));

    // If there's user input, append or replace last user message
    if (userInput) {
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage?.role === 'user') {
        // Append to last user message
        messages[messages.length - 1] = {
          ...lastMessage,
          content: lastMessage.content + '\n\n' + userInput
        };
      } else {
        // Add new user message
        messages.push({
          role: 'user',
          content: userInput
        });
      }
    }

    return messages;
  }

  /**
   * Execute the prompt via Socket.IO (same as PromptRunner)
   */
  private async executePromptViaSocket(
    messages: any[],
    config: PromptExecutionConfig,
    promptData: PromptExecutionData,
    onProgress?: (progress: ExecutionProgress) => void
  ): Promise<{ text: string; metadata: any }> {
    const { createAndSubmitTask } = await import('@/lib/redux/socket-io/thunks/submitTaskThunk');
    const { selectPrimaryResponseTextByTaskId, selectPrimaryResponseEndedByTaskId } = await import('@/lib/redux/socket-io/selectors/socket-response-selectors');
    
    const taskId = uuidv4();
    
    // Merge settings with config overrides
    const settings = {
      ...promptData.settings,
      ...config.modelConfig
    };

    const modelId = settings.model_id || config.modelConfig?.modelId;
    if (!modelId) {
      throw new Error('No model ID specified');
    }

    const { model_id, ...modelConfig } = settings;

    // Build chat_config for direct_chat task (same as PromptRunner)
    const chatConfig: Record<string, any> = {
      model_id: modelId,
      messages,
      stream: true,
      ...modelConfig,
    };

    // Submit task via Socket.IO
    await this.dispatch!(createAndSubmitTask({
      service: 'chat_service',
      taskName: 'direct_chat',
      taskData: { chat_config: chatConfig },
      customTaskId: taskId
    }));

    // Wait for streaming to complete
    return new Promise((resolve, reject) => {
      const streamStartTime = performance.now();
      let timeToFirstToken: number | undefined;
      let firstChunk = true;

      const checkInterval = setInterval(() => {
        const state = this.getState!();
        // These selectors return a selector function, so call them with taskId then with state
        const streamingText = selectPrimaryResponseTextByTaskId(taskId)(state);
        const isResponseEnded = selectPrimaryResponseEndedByTaskId(taskId)(state);

        if (streamingText) {
          if (firstChunk) {
            timeToFirstToken = Math.round(performance.now() - streamStartTime);
            firstChunk = false;
            
            onProgress?.({
              status: 'streaming',
              message: 'Receiving response...',
              streamedText: streamingText
            });
          } else {
            onProgress?.({
              status: 'streaming',
              streamedText: streamingText
            });
          }
        }

        if (isResponseEnded) {
          clearInterval(checkInterval);
          
          const finalText = streamingText || '';
          
          resolve({
            text: finalText,
            metadata: {
              taskId,
              model: modelId,
              timeToFirstToken,
              tokens: Math.round(finalText.length / 4) // Rough estimate
            }
          });
        }
      }, 100); // Check every 100ms

      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Execution timeout'));
      }, 120000);
    });
  }

  /**
   * Process output according to handler configuration
   */
  private async processOutput(
    handler: OutputHandler | undefined,
    text: string,
    metadata: any
  ): Promise<void> {
    if (!handler) {
      return; // No output handler specified
    }

    switch (handler.type) {
      case 'plain-text':
        handler.onComplete?.(text);
        break;

      case 'markdown':
        // Convert markdown to HTML if needed
        handler.onComplete?.(text); // For now, just pass through
        break;

      case 'json':
        try {
          const data = JSON.parse(text);
          handler.onComplete?.(data);
        } catch (error) {
          console.error('Failed to parse JSON output:', error);
          throw new Error('Response is not valid JSON');
        }
        break;

      case 'stream':
        // Streaming already handled during execution
        handler.onComplete?.(text);
        break;

      case 'canvas':
        // Open in canvas - would need canvas integration
        console.log('Canvas output not yet implemented');
        break;

      case 'toast':
        // Show toast notification
        const message = handler.successMessage || 'Prompt executed successfully';
        // Would integrate with toast service
        console.log('Toast:', message);
        break;

      case 'redux':
        // Dispatch to Redux
        console.log('Redux output not yet implemented');
        break;

      case 'custom':
        await handler.handler({
          success: true,
          text,
          metadata,
          resolvedVariables: {}
        });
        break;
    }
  }
}

/**
 * Singleton instance for convenience
 */
export const promptExecutionService = new PromptExecutionService();

/**
 * Convenience function to execute a prompt
 */
export async function executePrompt(
  config: PromptExecutionConfig
): Promise<ExecutionResult> {
  return promptExecutionService.execute(config);
}

