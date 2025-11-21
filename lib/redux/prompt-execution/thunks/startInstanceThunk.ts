/**
 * Start Instance Thunk
 * 
 * Smart thunk that:
 * 1. Checks if prompt is cached, fetches if needed (NO DUPLICATE FETCHES)
 * 2. Fetches scoped variables if not cached
 * 3. Creates execution instance in Redux
 * 4. Returns instanceId for component tracking
 * 
 * This is the entry point for ALL prompt executions.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import type { RootState, AppDispatch } from '../../store';
import type { StartInstancePayload, ExecutionInstance } from '../types';
import { createInstance, setInstanceStatus } from '../slice';
import {
  selectCachedPrompt,
  selectPromptFetchStatus,
  cachePrompt,
  setFetchStatus,
  type CachedPrompt,
} from '../../slices/promptCacheSlice';
import { supabase } from '@/utils/supabase/client';

/**
 * Start a new prompt execution instance
 * 
 * @example
 * ```typescript
 * const instanceId = await dispatch(startPromptInstance({
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
  string, // Returns instanceId
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
      runId,
    } = payload;

    // Generate instance ID
    const instanceId = uuidv4();

    try {
      // ========== STEP 1: Load Prompt (Cache-Aware) ==========
      const state = getState();
      let prompt = selectCachedPrompt(state, promptId);
      
      if (!prompt) {
        // Check if already being fetched
        const fetchStatus = selectPromptFetchStatus(state, promptId);
        if (fetchStatus === 'loading') {
          // Wait for ongoing fetch
          // TODO: Could implement a promise queue here
          throw new Error(`Prompt ${promptId} is already being fetched. Please try again.`);
        }
        
        // Fetch from database (correct table based on source)
        dispatch(setFetchStatus({ promptId, status: 'loading' }));
        
        const { data: promptData, error } = await supabase
          .from(promptSource)
          .select('*')
          .eq('id', promptId)
          .single();
        
        if (error || !promptData) {
          dispatch(setFetchStatus({ promptId, status: 'error' }));
          throw new Error(`Failed to fetch prompt from ${promptSource}: ${promptId}`);
        }
        
        // Cache the prompt
        const cachedPromptData: CachedPrompt = {
          id: promptData.id,
          name: promptData.name,
          description: promptData.description,
          messages: promptData.messages || [],
          variableDefaults: promptData.variable_defaults || [],
          variable_defaults: promptData.variable_defaults || [],
          settings: promptData.settings || {},
          source: promptSource,
          fetchedAt: Date.now(),
          status: 'cached',
        };
        
        dispatch(cachePrompt(cachedPromptData));
        prompt = cachedPromptData;
      }
      
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
        instanceId,
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
          runId: runId || null,
          sourceType: 'prompt',
          sourceId: promptId,
          runName: null,
          totalTokens: 0,
          totalCost: 0,
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
      if (runId) {
        // TODO: Implement loadRunMessages
        // await dispatch(loadRunMessages({ instanceId, runId }));
      }
      
      console.log('✅ Prompt instance created:', {
        instanceId,
        promptId,
        promptSource,
        promptName: prompt.name,
        runId,
      });
      
      return instanceId;
      
    } catch (error) {
      console.error('❌ Failed to start prompt instance:', error);
      
      // Update instance status to error if it was created
      dispatch(setInstanceStatus({
        instanceId,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
      
      throw error;
    }
  }
);

