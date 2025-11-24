/**
 * Execute Builtin with Code Extraction Thunk
 * 
 * Generic thunk for executing any builtin and extracting code from the response.
 * Use this when you need to run a builtin that generates code in a markdown codeblock.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from '../../store';
import { startPromptInstance } from './startInstanceThunk';
import { executeMessage } from './executeMessageThunk';
import { removeInstance } from '../slice';
import { 
  selectStreamingTextForInstance, 
  selectIsResponseEndedForInstance 
} from '../selectors';
import { getBuiltinId } from '../builtins';

interface ExecuteBuiltinWithCodeExtractionPayload {
  /** Builtin key (e.g., 'prompt-app-auto-create') or UUID */
  builtinKey: string;
  
  /** Variables to pass to the builtin */
  variables: Record<string, string>;
  
  /** Optional: Override execution config */
  executionConfig?: {
    auto_run?: boolean;
    allow_chat?: boolean;
    show_variables?: boolean;
    apply_variables?: boolean;
    track_in_runs?: boolean;
  };
  
  /** Optional: Timeout in milliseconds (default: 120000 = 2 minutes) */
  timeoutMs?: number;
}

interface ExecuteBuiltinWithCodeExtractionResult {
  success: boolean;
  code?: string;
  fullResponse?: string;
  error?: string;
  runId?: string;
  taskId?: string;
}

/**
 * Extract code from markdown codeblock
 * Handles: tsx, jsx, typescript, ts, javascript, js, python, py, etc.
 */
function extractCodeFromResponse(response: string): string | null {
  // Match code blocks with optional language specifiers
  const codeBlockRegex = /```(?:\w+)?\n([\s\S]*?)```/;
  const match = response.match(codeBlockRegex);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  return null;
}

/**
 * Wait for streaming to complete and return full response
 */
async function waitForCompletion(
  runId: string,
  getState: () => RootState,
  timeoutMs: number = 120000
): Promise<string> {
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(() => {
      const state = getState();
      const isEnded = selectIsResponseEndedForInstance(state, runId);
      
      if (isEnded) {
        clearInterval(checkInterval);
        const fullResponse = selectStreamingTextForInstance(state, runId) || '';
        resolve(fullResponse);
        return;
      }
      
      // Check timeout
      if (Date.now() - startTime > timeoutMs) {
        clearInterval(checkInterval);
        reject(new Error('Timeout waiting for response'));
      }
    }, 100);
  });
}

/**
 * Execute a builtin and extract code from its response
 * 
 * @example
 * ```typescript
 * const result = await dispatch(executeBuiltinWithCodeExtraction({
 *   builtinKey: 'prompt-app-auto-create',
 *   variables: { prompt_object: '...', ... }
 * })).unwrap();
 * 
 * if (result.success) {
 *   console.log('Generated code:', result.code);
 * }
 * ```
 */
export const executeBuiltinWithCodeExtraction = createAsyncThunk<
  ExecuteBuiltinWithCodeExtractionResult,
  ExecuteBuiltinWithCodeExtractionPayload,
  {
    dispatch: AppDispatch;
    state: RootState;
  }
>(
  'promptExecution/executeBuiltinWithCodeExtraction',
  async (payload, { dispatch, getState }) => {
    const {
      builtinKey,
      variables,
      executionConfig = {},
      timeoutMs = 120000
    } = payload;

    let runId: string | null = null;

    try {
      // Resolve builtin ID (accepts key or UUID)
      const builtinId = getBuiltinId(builtinKey);
      
      // Start the prompt instance
      runId = await dispatch(startPromptInstance({
        promptId: builtinId,
        promptSource: 'prompt_builtins',
        variables,
        executionConfig: {
          auto_run: false,
          allow_chat: false,
          show_variables: false,
          apply_variables: true,
          track_in_runs: true,
          ...executionConfig
        },
      })).unwrap();

      // Execute the message
      const taskId = await dispatch(executeMessage({ runId })).unwrap();

      // Wait for response to complete
      const fullResponse = await waitForCompletion(runId, getState, timeoutMs);

      // Extract code from response
      const code = extractCodeFromResponse(fullResponse);
      
      if (!code) {
        return {
          success: false,
          fullResponse,
          error: 'No code block found in response',
          runId,
          taskId
        };
      }

      return {
        success: true,
        code,
        fullResponse,
        runId,
        taskId
      };

    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        runId: runId || undefined
      };
    } finally {
      // Clean up the instance
      if (runId) {
        dispatch(removeInstance({ runId }));
      }
    }
  }
);

