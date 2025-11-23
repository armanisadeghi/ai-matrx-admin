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
}

interface ExecuteBuiltinWithJsonExtractionResult<T = any> {
  success: boolean;
  data?: T;
  fullResponse?: string;
  error?: string;
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
  async ({ builtinKey, variables, timeoutMs = 120000, pollingIntervalMs = 100 }, { dispatch, getState }) => {
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
          },
        })
      )).unwrap();

      // 2. Execute the message (no user input, just trigger the prompt)
      const taskId = await dispatch(executeMessage({ runId })).unwrap();
      console.log(`[executeBuiltinWithJsonExtraction] Task created: ${taskId}`);

      // 3. Wait for completion and get full response
      const startTime = Date.now();
      let fullResponse = '';
      let isResponseEnded = false;

      while (!isResponseEnded && (Date.now() - startTime < timeoutMs)) {
        await new Promise(resolve => setTimeout(resolve, pollingIntervalMs));
        const state = getState();
        fullResponse = selectStreamingTextForInstance(state, runId);
        isResponseEnded = selectIsResponseEndedForInstance(state, runId);
      }

      if (!isResponseEnded) {
        throw new Error('AI response timed out.');
      }

      // 4. Extract JSON from the full response
      const data = extractJsonFromResponse(fullResponse);

      if (!data) {
        return {
          success: false,
          fullResponse,
          error: 'No valid JSON found in AI response. Full response provided for debugging.',
        };
      }

      return { success: true, data, fullResponse };

    } catch (error: any) {
      console.error(`[executeBuiltinWithJsonExtraction] Error:`, error);
      const state = getState();
      const fullResponse = runId ? selectStreamingTextForInstance(state, runId) : '';

      return {
        success: false,
        fullResponse,
        error: error.message || 'An unknown error occurred during AI JSON generation.',
      };
    } finally {
      // Clean up the instance from Redux store
      if (runId) {
        dispatch(removeInstance({ runId }));
      }
    }
  }
);

