/**
 * Start Instance Thunk
 * 
 * Smart thunk that:
 * 1. Checks if prompt is cached, fetches if needed (NO DUPLICATE FETCHES)
 * 2. Fetches scoped variables if not cached
 * 3. Creates execution instance in Redux
 * 4. Returns runId for component tracking
 * 
 * This is the entry point for ALL prompt executions.
 * 
 * NOTE: The slice's createInstance action automatically initializes:
 * - currentInputs[runId] = ''
 * - resources[runId] = []
 * - uiState[runId] = { expandedVariable: null, showVariables: config.show_variables }
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { RootState, AppDispatch } from '../../store';
import type { StartInstancePayload, ExecutionInstance } from '../types';
import { createInstance, setInstanceStatus, setCurrentInput } from '../slice';
import { getPrompt } from '../../thunks/promptSystemThunks';

/**
 * Start a new prompt execution instance
 * 
 * @example
 * ```typescript
 * const runId = await dispatch(startPromptInstance({
 *   promptId: 'text-analyzer',
 *   executionConfig: {
 *     auto_run: true,
 *     track_in_runs: true,
 *   },
 *   variables: { text: selectedText },
 * })).unwrap();
 * ```
 */
export const startPromptInstance = createAsyncThunk<
  string, // Returns runId
  StartInstancePayload,
  {
    dispatch: AppDispatch;
    state: RootState;
  }
>(
  'promptExecution/startInstance',
  async (payload, { dispatch, getState }) => {
    const {
      promptId,
      promptSource = 'prompts', // Default to custom prompts for backwards compatibility
      executionConfig = {},
      variables = {},
      initialMessage = '',
      runId: providedRunId,
    } = payload;

    // Use provided runId or generate new one
    const runId = providedRunId || uuidv4();

    try {
      // ========== STEP 1: Load Prompt (Cache-First via centralized system) ==========
      const { promptData: promptDataObj } = await dispatch(
        getPrompt({
          promptId,
          source: promptSource,
          allowStale: false
        })
      ).unwrap();

      // Convert to format expected by rest of function
      const prompt = {
        id: promptDataObj.id,
        name: promptDataObj.name,
        description: promptDataObj.description,
        messages: promptDataObj.messages,
        variableDefaults: promptDataObj.variableDefaults,
        settings: promptDataObj.settings,
        source: promptSource,
      };

      // ========== STEP 2: Fetch Scoped Variables (Cache-Aware) ==========
      // TODO: Implement fetchScopedVariablesThunk
      // const scopedVars = await dispatch(fetchScopedVariables({ userId, orgId, projectId }));

      // ========== STEP 3: Compute Runtime Variables ==========
      const computedVariables: Record<string, string> = {
        current_date: new Date().toISOString().split('T')[0],
        current_time: new Date().toTimeString().split(' ')[0],
        current_datetime: new Date().toISOString(),
        // Add more runtime variables as needed
      };

      // ========== STEP 4: Create Execution Instance ==========
      const now = Date.now();
      const instance: ExecutionInstance = {
        // Identity
        runId,
        promptId,
        promptSource,

        // Status
        status: 'ready',
        error: null,

        // Timestamps
        createdAt: now,
        updatedAt: now, // Only updated on execution completion

        // Configuration
        settings: prompt.settings,
        executionConfig: {
          auto_run: executionConfig.auto_run ?? false,
          allow_chat: executionConfig.allow_chat ?? true,
          show_variables: executionConfig.show_variables ?? false,
          apply_variables: executionConfig.apply_variables ?? true,
          track_in_runs: executionConfig.track_in_runs ?? true,
        },

        // Variables
        variables: {
          userValues: { ...variables },
          scopedValues: {}, // TODO: Fill from fetchScopedVariables
          computedValues: computedVariables,
        },
        variableDefaults: prompt.variableDefaults || [],

        // Messages: Store template messages directly (NOT variable replaced yet)
        messages: prompt.messages.map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content,
          timestamp: '', // Will be set during first execution
        })),

        // First execution flag: templates need variable replacement
        requiresVariableReplacement: true,

        // Execution tracking
        execution: {
          currentTaskId: null,
          messageStartTime: null,
          timeToFirstToken: undefined,
          lastMessageStats: null,
        },

        // Run tracking
        runTracking: {
          sourceType: promptSource,
          sourceId: promptId,
          runName: null,
          totalTokens: 0,
          totalCost: 0,
          savedToDatabase: false,
        },

        // NOTE: ui state is now in isolated uiState map
        // It's initialized by createInstance action based on executionConfig.show_variables
      };

      // Add instance to Redux (this also initializes isolated state maps)
      dispatch(createInstance(instance));

      // Set initial message if provided (uses isolated currentInputs map)
      if (initialMessage) {
        dispatch(setCurrentInput({ runId, input: initialMessage }));
      }

      // If loading existing run, fetch messages
      if (providedRunId) {
        // Dynamically import to avoid circular dependency if possible, or just use the imported action
        // We need to import loadRun. Since it's in the same directory structure, we can import it at top level if no circular dep.
        // But loadRun imports createInstance from slice, and startInstance imports createInstance from slice.
        // They don't import each other directly.

        // However, we need to dispatch it.
        const { loadRun } = await import('./loadRunThunk');
        await dispatch(loadRun({ runId: providedRunId }));
      }

      console.log('✅ Prompt instance created:', {
        runId,
        promptId,
        promptSource,
        promptName: prompt.name,
      });

      return runId;

    } catch (error) {
      console.error('❌ Failed to start prompt instance:', error);

      // Update instance status to error if it was created
      dispatch(setInstanceStatus({
        runId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }));

      throw error;
    }
  }
);
