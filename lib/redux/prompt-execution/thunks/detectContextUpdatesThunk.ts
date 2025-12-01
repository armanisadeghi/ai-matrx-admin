/**
 * Detect Context Updates Thunk
 * 
 * Automatically detects and extracts updated contexts from AI responses.
 * Parses context XML blocks and updates the corresponding contexts in Redux.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../../store';
import { updateDynamicContext } from '../slice';
import { selectDynamicContexts, selectDynamicContext } from '../selectors';
import { extractContextsFromXml } from '../utils/context-formatter';

export interface DetectContextUpdatesPayload {
  runId: string;
  responseContent: string;
  autoUpdateEnabled?: boolean;
}

/**
 * Detect and update contexts from AI response
 * 
 * This thunk:
 * 1. Parses the AI response for context XML blocks
 * 2. Checks if contexts exist for this run
 * 3. Updates matching contexts with new content
 * 4. Optionally creates summary from the update
 * 
 * @example
 * ```typescript
 * await dispatch(detectAndUpdateContextsFromResponse({
 *   runId: 'abc-123',
 *   responseContent: aiResponseText,
 *   autoUpdateEnabled: true,
 * }));
 * ```
 */
export const detectAndUpdateContextsFromResponse = createAsyncThunk<
  { updatedContextIds: string[]; skippedContextIds: string[] },
  DetectContextUpdatesPayload,
  {
    dispatch: AppDispatch;
    state: RootState;
  }
>(
  'promptExecution/detectContextUpdates',
  async (payload, { dispatch, getState }) => {
    const { runId, responseContent, autoUpdateEnabled = true } = payload;

    if (!autoUpdateEnabled) {
      return { updatedContextIds: [], skippedContextIds: [] };
    }

    const state = getState();
    const currentContexts = selectDynamicContexts(state, runId);

    // Parse contexts from the AI response
    const parsedContexts = extractContextsFromXml(responseContent);

    if (parsedContexts.length === 0) {
      console.log('No context blocks found in AI response');
      return { updatedContextIds: [], skippedContextIds: [] };
    }

    const updatedContextIds: string[] = [];
    const skippedContextIds: string[] = [];

    // Process each detected context
    for (const parsed of parsedContexts) {
      const { contextId, content, version } = parsed;

      if (!contextId) {
        console.warn('Skipping context with missing ID');
        continue;
      }

      // Check if context exists in our state
      const existingContext = selectDynamicContext(getState(), runId, contextId);

      if (!existingContext) {
        console.warn(
          `Context "${contextId}" found in response but not tracked in state. Skipping.`
        );
        skippedContextIds.push(contextId);
        continue;
      }

      // Check if content actually changed
      if (content === existingContext.currentContent) {
        console.log(`Context "${contextId}" unchanged, skipping update`);
        skippedContextIds.push(contextId);
        continue;
      }

      // Generate a summary based on version difference
      let summary = 'Auto-updated from AI response';
      if (version && version > existingContext.currentVersion) {
        summary = `Updated to version ${version}`;
      }

      // Update the context
      dispatch(updateDynamicContext({
        runId,
        contextId,
        content,
        summary,
      }));

      updatedContextIds.push(contextId);
    }

    if (updatedContextIds.length > 0) {
      console.log('✅ Auto-detected context updates:', {
        runId,
        updatedContextIds,
        skippedContextIds,
      });
    }

    return { updatedContextIds, skippedContextIds };
  }
);

/**
 * Extract context diff summary
 * 
 * Helper to generate a brief summary of changes between two context versions.
 * Can be enhanced later with more sophisticated diff analysis.
 */
export function generateContextDiffSummary(
  oldContent: string,
  newContent: string
): string {
  // Simple line-based diff summary
  const oldLines = oldContent.split('\n').length;
  const newLines = newContent.split('\n').length;
  const lineDiff = newLines - oldLines;

  if (lineDiff > 0) {
    return `Added ${lineDiff} line${lineDiff !== 1 ? 's' : ''}`;
  } else if (lineDiff < 0) {
    return `Removed ${Math.abs(lineDiff)} line${lineDiff !== -1 ? 's' : ''}`;
  } else {
    return 'Modified content';
  }
}

