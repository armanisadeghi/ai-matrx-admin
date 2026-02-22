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
    use_pre_execution_input?: boolean;
  };
  
  /** Optional: Timeout in milliseconds (default: 120000 = 2 minutes) */
  timeoutMs?: number;

  /**
   * Called as soon as the taskId is known (before streaming completes).
   * Use this to wire up live streaming UI before the thunk resolves.
   */
  onTaskId?: (taskId: string) => void;
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
 *
 * Robust against:
 * - Windows (\r\n) and Unix (\n) line endings
 * - Trailing spaces after the language tag (e.g. "```tsx ")
 * - Missing language tag
 * - Multiple code blocks (returns first one)
 */
function extractCodeFromResponse(response: string): string | null {
  // Normalize Windows line endings so \n always works as delimiter
  const normalized = response.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Allow optional language tag followed by optional whitespace before the newline
  const codeBlockRegex = /```(?:\w+)?[^\S\n]*\n([\s\S]*?)```/;
  const match = normalized.match(codeBlockRegex);

  if (match && match[1]) {
    return match[1].trim();
  }

  return null;
}

/**
 * Wait for streaming to complete and return full response.
 *
 * The fetch layer (executeMessageFastAPIThunk) already handles stream stalls:
 * if no bytes arrive for 45 seconds it aborts the connection and dispatches an
 * error + markResponseEnd, which causes isEnded to flip to true here. We just
 * need to wait for that signal and then read whatever text was accumulated.
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

      if (Date.now() - startTime > timeoutMs) {
        clearInterval(checkInterval);
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        reject(new Error(
          `Timed out after ${elapsed} seconds waiting for AI response. ` +
          'If you switched browser tabs during this process, that may have caused the connection to be suspended. ' +
          'Please keep this tab active and try again.'
        ));
      }
    }, 500);
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
      timeoutMs = 120000,
      onTaskId,
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
          use_pre_execution_input: false,
          ...executionConfig
        },
      })).unwrap();

      // Execute the message
      const taskId = await dispatch(executeMessage({ runId })).unwrap();

      // Notify caller immediately so live streaming UI can subscribe before waiting
      onTaskId?.(taskId);

      // Wait for response to complete
      const fullResponse = await waitForCompletion(runId, getState, timeoutMs);

      // Extract code from response
      const code = extractCodeFromResponse(fullResponse);
      
      if (!code) {
        console.error(
          '[executeBuiltinWithCodeExtraction] No code block found in response. Full response:\n',
          fullResponse
        );
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

