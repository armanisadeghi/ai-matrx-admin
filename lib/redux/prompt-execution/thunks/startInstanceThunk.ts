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
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { RootState, AppDispatch } from '../../store';
import type { StartInstancePayload, ExecutionInstance } from '../types';
import { createInstance, setInstanceStatus } from '../slice';
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
        variableDefaults: promptDataObj.variableDefaults || promptDataObj.variable_defaults,
        variable_defaults: promptDataObj.variable_defaults || promptDataObj.variableDefaults,
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
      const instance: ExecutionInstance = {
        // Identity
        runId,
        promptId,
        promptSource,
        
        // Status
        status: 'ready',
        error: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        
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
          userValues: { ...variables }, // User-provided values
          scopedValues: {}, // TODO: Fill from fetchScopedVariables
          computedValues: computedVariables,
        },
        
        // Conversation
        conversation: {
          messages: [],
          currentInput: initialMessage,
          resources: [],
        },
        
        // Execution tracking
        execution: {
          currentTaskId: null,
          messageStartTime: null,
          timeToFirstToken: undefined,
          lastMessageStats: null,
        },
        
        // Run tracking
        runTracking: {
          sourceType: promptSource, // Dynamic: 'prompts' or 'prompt_builtins'
          sourceId: promptId,
          runName: null,
          totalTokens: 0,
          totalCost: 0,
          savedToDatabase: false, // Will be set to true when saved to DB
        },
        
        // UI state
        ui: {
          expandedVariable: null,
          showVariables: executionConfig.show_variables ?? false,
        },
      };
      
      // Add instance to Redux
      dispatch(createInstance(instance));
      
      // If loading existing run, fetch messages
      if (providedRunId) {
        // TODO: Implement loadRunMessages
        // await dispatch(loadRunMessages({ runId }));
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

