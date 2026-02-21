import { createAsyncThunk } from '@reduxjs/toolkit';
import { AppDispatch, RootState } from '@/lib/redux/store';
import { startPromptInstance, executeMessage } from './';
import { createBuiltinConfig } from '../builtins';
import { selectStreamingTextForInstance, selectIsResponseEndedForInstance } from '../selectors';
import { removeInstance } from '../slice';

interface ExecuteBuiltinWithJsonExtractionPayload {
  builtinKey: string;
  variables: Record<string, string>;
  timeoutMs?: number;
  pollingIntervalMs?: number;
  /**
   * Called as soon as the taskId is known (before streaming completes).
   * Use this to wire up live streaming UI before the thunk resolves.
   */
  onTaskId?: (taskId: string) => void;
}

interface ExecuteBuiltinWithJsonExtractionResult<T = any> {
  success: boolean;
  data?: T;
  fullResponse?: string;
  error?: string;
  taskId?: string;
  runId?: string;
}

/**
 * Extracts JSON from markdown code blocks or raw JSON in the response
 */
function extractJsonFromResponse(response: string): any | null {
  try {
    // Try to find JSON in code blocks first (```json ... ``` or ```... ```)
    const codeBlockMatch = response.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      const jsonString = codeBlockMatch[1].trim();
      return JSON.parse(jsonString);
    }

    // Try to find raw JSON object in the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    // Try parsing the entire response as JSON
    return JSON.parse(response.trim());
  } catch (error) {
    console.error('[extractJsonFromResponse] Failed to parse JSON:', error);
    return null;
  }
}

/**
 * Generic thunk for executing a builtin and extracting JSON from the response
 */
export const executeBuiltinWithJsonExtraction = createAsyncThunk<
  ExecuteBuiltinWithJsonExtractionResult,
  ExecuteBuiltinWithJsonExtractionPayload,
  {
    dispatch: AppDispatch;
    state: RootState;
  }
>(
  'promptExecution/executeBuiltinWithJsonExtraction',
  async ({ builtinKey, variables, timeoutMs = 120000, pollingIntervalMs = 100, onTaskId }, { dispatch, getState }) => {
    let runId: string | null = null;
    try {
      // 1. Start the prompt instance
      runId = await dispatch(startPromptInstance(
        createBuiltinConfig(builtinKey, {
          variables,
          executionConfig: {
            auto_run: false,
            allow_chat: false,
            show_variables: false,
            apply_variables: true,
            track_in_runs: true,
            use_pre_execution_input: false,
          },
        })
      )).unwrap();

      // 2. Execute the message (no user input, just trigger the prompt)
      const taskId = await dispatch(executeMessage({ runId })).unwrap();

      // Notify caller immediately so live streaming UI can subscribe before waiting
      onTaskId?.(taskId);

      // 3. Wait for completion and get full response.
      //
      // The fetch layer (executeMessageFastAPIThunk) handles stream stalls:
      // if no bytes arrive for 45 seconds it aborts and dispatches markResponseEnd,
      // which causes isResponseEnded to flip here. We just wait for that signal.
      const startTime = Date.now();
      let fullResponse = '';
      let isResponseEnded = false;

      while (!isResponseEnded && (Date.now() - startTime < timeoutMs)) {
        await new Promise(resolve => setTimeout(resolve, Math.max(pollingIntervalMs, 500)));
        const state = getState();
        fullResponse = selectStreamingTextForInstance(state, runId);
        isResponseEnded = selectIsResponseEndedForInstance(state, runId);
      }

      if (!isResponseEnded) {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        throw new Error(
          `AI response timed out after ${elapsed} seconds. ` +
          'If you switched browser tabs during this process, that may have caused the connection to be suspended. ' +
          'Please keep this tab active and try again.'
        );
      }

      // 4. Extract JSON from the full response
      const data = extractJsonFromResponse(fullResponse);

      if (!data) {
        return {
          success: false,
          fullResponse,
          error: 'No valid JSON found in AI response. Full response provided for debugging.',
          taskId,
          runId,
        };
      }

      return { success: true, data, fullResponse, taskId, runId };

    } catch (error: any) {
      const state = getState();
      const fullResponse = runId ? selectStreamingTextForInstance(state, runId) : '';
      const instance = runId ? state.promptExecution?.instances?.[runId] : null;
      const taskId = instance?.execution?.currentTaskId || undefined;

      return {
        success: false,
        fullResponse,
        error: error.message || 'An unknown error occurred during AI JSON generation.',
        taskId,
        runId: runId || undefined,
      };
    } finally {
      // Clean up the instance from Redux store
      if (runId) {
        dispatch(removeInstance({ runId }));
      }
    }
  }
);

