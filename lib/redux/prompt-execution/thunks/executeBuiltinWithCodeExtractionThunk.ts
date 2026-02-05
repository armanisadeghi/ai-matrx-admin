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
 * Wait for streaming to complete and return full response.
 * 
 * Includes socket health monitoring to detect disconnections early
 * instead of waiting for the full timeout to elapse. This is critical
 * for long-running operations where the browser tab may be backgrounded.
 */
async function waitForCompletion(
  runId: string,
  getState: () => RootState,
  timeoutMs: number = 120000
): Promise<string> {
  const startTime = Date.now();
  let lastTextLength = 0;
  let lastProgressTime = Date.now();
  // If no new data arrives for this long AND socket is disconnected, fail fast
  const STALE_THRESHOLD_MS = 30000;
  
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
      
      // Track streaming progress to detect stalls
      const currentText = selectStreamingTextForInstance(state, runId) || '';
      if (currentText.length > lastTextLength) {
        lastTextLength = currentText.length;
        lastProgressTime = Date.now();
      }
      
      // Early detection: if no new data for a while, check socket health
      const timeSinceProgress = Date.now() - lastProgressTime;
      if (timeSinceProgress > STALE_THRESHOLD_MS) {
        try {
          // Dynamic import to avoid circular deps - check socket health
          const { SocketConnectionManager } = require('../../socket-io/connection/socketConnectionManager');
          const socketManager = SocketConnectionManager.getInstance();
          
          if (!socketManager.isConnectionHealthy()) {
            clearInterval(checkInterval);
            reject(new Error(
              'Lost connection to the server. This typically happens when the browser tab is in the background. ' +
              'Please keep this tab active and try again.'
            ));
            return;
          }
        } catch {
          // If we can't check socket health, fall through to timeout
        }
      }
      
      // Check timeout
      if (Date.now() - startTime > timeoutMs) {
        clearInterval(checkInterval);
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        reject(new Error(
          `Timed out after ${elapsed} seconds waiting for AI response. ` +
          'If you switched browser tabs during this process, that may have caused the connection to drop.'
        ));
      }
    }, 500); // Increased from 100ms to 500ms - more background-tab friendly while still responsive
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
          use_pre_execution_input: false,
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

