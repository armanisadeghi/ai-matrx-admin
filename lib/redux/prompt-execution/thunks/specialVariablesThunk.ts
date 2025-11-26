/**
 * Special Variables Thunk
 * 
 * Auto-populates special variables for code editor and other contexts.
 * 
 * Special variables are system-managed variables that are automatically filled
 * based on context (current code, selection, etc.). This eliminates the need
 * for components to manually manage these variables.
 * 
 * @module specialVariablesThunk
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { AppDispatch, RootState } from '../../store';
import { updateVariables } from '../slice';
import { selectInstance } from '../selectors';
import { selectCachedPrompt } from '../../slices/promptCacheSlice';
import {
  buildSpecialVariables,
  getRequiredSpecialVariables,
  logSpecialVariablesUsage,
  type CodeEditorContext
} from '@/features/code-editor/utils/specialVariables';

/**
 * Populate special variables for a prompt instance
 * 
 * Automatically detects which special variables are needed by the prompt
 * and populates them from the provided context.
 * 
 * Code is automatically wrapped in markdown code blocks with the appropriate
 * language for better AI model comprehension (unless already wrapped).
 * 
 * Special variables include:
 * - `current_code`: The full current file content (wrapped in code block)
 * - `content`: Alias for current_code (wrapped in code block)
 * - `selection`: Currently selected/highlighted text (wrapped in code block)
 * - `context`: Additional context from other files (wrapped in code block)
 * 
 * @example
 * ```typescript
 * // In a component or hook:
 * await dispatch(populateSpecialVariables({
 *   runId: 'abc-123',
 *   codeContext: {
 *     currentCode: fileContent,
 *     selection: selectedText,
 *     context: relatedFiles,
 *     language: 'typescript' // Optional: for proper code block wrapping
 *   }
 * })).unwrap();
 * ```
 * 
 * @example
 * ```typescript
 * // In an effect that updates on code change:
 * useEffect(() => {
 *   if (runId && currentCode) {
 *     dispatch(populateSpecialVariables({
 *       runId,
 *       codeContext: { currentCode, selection, context, language: 'typescript' }
 *     }));
 *   }
 * }, [runId, currentCode, selection, context, dispatch]);
 * ```
 */
export const populateSpecialVariables = createAsyncThunk<
  Record<string, string>, // Returns the populated variables
  {
    runId: string;
    codeContext: CodeEditorContext;
  },
  { 
    dispatch: AppDispatch; 
    state: RootState;
    rejectValue: string;
  }
>(
  'promptExecution/populateSpecialVariables',
  async ({ runId, codeContext }, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState();
      const instance = selectInstance(state, runId);
      
      if (!instance) {
        return rejectWithValue('Instance not found');
      }
      
      const cachedPrompt = selectCachedPrompt(state, instance.promptId);
      
      if (!cachedPrompt) {
        return rejectWithValue('Prompt not found in cache');
      }
      
      // Get variables defined in the prompt
      const promptVariables = cachedPrompt.variableDefaults || [];
      
      // Determine which special variables are needed
      const requiredSpecialVars = getRequiredSpecialVariables(promptVariables);
      
      if (requiredSpecialVars.length === 0) {
        // No special variables in this prompt - nothing to do
        console.log('ℹ️ No special variables required for this prompt');
        return {};
      }
      
      // Build special variable values from context
      const specialVars = buildSpecialVariables(codeContext, requiredSpecialVars, codeContext.language);
      
      // Log for debugging
      logSpecialVariablesUsage(cachedPrompt.name, specialVars);
      
      // Update all special variables at once in Redux
      dispatch(updateVariables({ runId, variables: specialVars }));
      
      console.log(`✅ Populated ${Object.keys(specialVars).length} special variable(s)`);
      
      return specialVars;
      
    } catch (error) {
      console.error('❌ Failed to populate special variables:', error);
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to populate special variables'
      );
    }
  }
);

/**
 * Update special variables when context changes
 * 
 * Convenience thunk that only updates variables if they've actually changed.
 * Useful for frequent updates (e.g., on every keystroke) without unnecessary
 * Redux dispatches.
 * 
 * @example
 * ```typescript
 * // In an editor component that updates frequently:
 * const debouncedUpdate = useMemo(
 *   () => debounce((code: string) => {
 *     dispatch(updateSpecialVariablesIfChanged({
 *       runId,
 *       codeContext: { currentCode: code }
 *     }));
 *   }, 500),
 *   [runId, dispatch]
 * );
 * 
 * useEffect(() => {
 *   debouncedUpdate(currentCode);
 * }, [currentCode, debouncedUpdate]);
 * ```
 */
export const updateSpecialVariablesIfChanged = createAsyncThunk<
  Record<string, string> | null,
  {
    runId: string;
    codeContext: CodeEditorContext;
  },
  { 
    dispatch: AppDispatch; 
    state: RootState;
    rejectValue: string;
  }
>(
  'promptExecution/updateSpecialVariablesIfChanged',
  async ({ runId, codeContext }, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState();
      const instance = selectInstance(state, runId);
      
      if (!instance) {
        return rejectWithValue('Instance not found');
      }
      
      const cachedPrompt = selectCachedPrompt(state, instance.promptId);
      
      if (!cachedPrompt) {
        return rejectWithValue('Prompt not found in cache');
      }
      
      const promptVariables = cachedPrompt.variableDefaults || [];
      const requiredSpecialVars = getRequiredSpecialVariables(promptVariables);
      
      if (requiredSpecialVars.length === 0) {
        return null; // No special variables
      }
      
      // Build new values
      const newSpecialVars = buildSpecialVariables(codeContext, requiredSpecialVars, codeContext.language);
      
      // Check if any values actually changed
      const currentVars = instance.variables.userValues;
      const hasChanges = requiredSpecialVars.some(
        varName => currentVars[varName] !== newSpecialVars[varName]
      );
      
      if (!hasChanges) {
        console.log('ℹ️ Special variables unchanged, skipping update');
        return null;
      }
      
      // Update only changed variables
      dispatch(updateVariables({ runId, variables: newSpecialVars }));
      
      console.log(`✅ Updated ${Object.keys(newSpecialVars).length} special variable(s)`);
      
      return newSpecialVars;
      
    } catch (error) {
      console.error('❌ Failed to update special variables:', error);
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to update special variables'
      );
    }
  }
);

/**
 * Clear special variables
 * 
 * Removes special variable values from an instance.
 * Useful when switching contexts or cleaning up.
 * 
 * @example
 * ```typescript
 * await dispatch(clearSpecialVariables({
 *   runId: 'abc-123'
 * })).unwrap();
 * ```
 */
export const clearSpecialVariables = createAsyncThunk<
  string[],
  {
    runId: string;
  },
  { 
    dispatch: AppDispatch; 
    state: RootState;
    rejectValue: string;
  }
>(
  'promptExecution/clearSpecialVariables',
  async ({ runId }, { dispatch, getState, rejectWithValue }) => {
    try {
      const state = getState();
      const instance = selectInstance(state, runId);
      
      if (!instance) {
        return rejectWithValue('Instance not found');
      }
      
      const cachedPrompt = selectCachedPrompt(state, instance.promptId);
      
      if (!cachedPrompt) {
        return rejectWithValue('Prompt not found in cache');
      }
      
      const promptVariables = cachedPrompt.variableDefaults || [];
      const requiredSpecialVars = getRequiredSpecialVariables(promptVariables);
      
      if (requiredSpecialVars.length === 0) {
        return []; // No special variables to clear
      }
      
      // Clear by setting to empty strings
      const emptyVars = requiredSpecialVars.reduce((acc, varName) => {
        acc[varName] = '';
        return acc;
      }, {} as Record<string, string>);
      
      dispatch(updateVariables({ runId, variables: emptyVars }));
      
      console.log(`✅ Cleared ${requiredSpecialVars.length} special variable(s)`);
      
      return requiredSpecialVars;
      
    } catch (error) {
      console.error('❌ Failed to clear special variables:', error);
      return rejectWithValue(
        error instanceof Error ? error.message : 'Failed to clear special variables'
      );
    }
  }
);

