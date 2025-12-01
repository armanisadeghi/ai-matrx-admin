/**
 * Update Dynamic Context Thunk
 * 
 * Thunk for manually updating a dynamic context with a new version.
 * Used by components to explicitly update context content.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../../store';
import { updateDynamicContext } from '../slice';
import { selectDynamicContext } from '../selectors';

export interface UpdateDynamicContextVersionPayload {
  runId: string;
  contextId: string;
  content: string;
  summary?: string;
}

/**
 * Update a dynamic context with a new version
 * 
 * This creates a new version entry in the context's history and updates
 * the current content. The old version is preserved in the versions array.
 * 
 * @example
 * ```typescript
 * await dispatch(updateDynamicContextVersion({
 *   runId: 'abc-123',
 *   contextId: 'file_1',
 *   content: updatedCode,
 *   summary: 'Added error handling',
 * }));
 * ```
 */
export const updateDynamicContextVersion = createAsyncThunk<
  void,
  UpdateDynamicContextVersionPayload,
  {
    dispatch: AppDispatch;
    state: RootState;
  }
>(
  'promptExecution/updateDynamicContextVersion',
  async (payload, { dispatch, getState }) => {
    const { runId, contextId, content, summary } = payload;

    const state = getState();
    const context = selectDynamicContext(state, runId, contextId);

    if (!context) {
      console.error(
        `Cannot update context: Context "${contextId}" not found for run "${runId}"`
      );
      throw new Error(`Context "${contextId}" not found for run "${runId}"`);
    }

    // Dispatch the update action
    dispatch(updateDynamicContext({
      runId,
      contextId,
      content,
      summary,
    }));

    console.log('✅ Dynamic context updated:', {
      runId,
      contextId,
      newVersion: context.currentVersion + 1,
      summary,
    });
  }
);

