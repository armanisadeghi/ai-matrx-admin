/**
 * Start Prompt Action Thunk
 * 
 * Executes a prompt action with context-aware broker resolution.
 * 
 * Flow:
 * 1. Load action (cache if possible)
 * 2. Load referenced prompt
 * 3. Resolve brokers for context
 * 4. Map broker values to variable names
 * 5. Apply hardcoded overrides
 * 6. Merge with user-provided values
 * 7. Execute via standard engine
 * 
 * Variable precedence: User Input > Hardcoded > Broker > Prompt Default
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../../store';
import { startPromptInstance } from './startInstanceThunk';
import { getAction } from '@/features/prompt-actions/services/action-service';
import { resolveBrokersForContext } from '@/features/brokers/services/resolution-service';
import {
  cacheAction,
  selectCachedAction,
  selectActionFetchStatus,
  setFetchStatus,
  setFetchError,
} from '../actionCacheSlice';
import { selectCachedPrompt } from '../../slices/promptCacheSlice';
import type { ActionExecutionResult, ExecuteActionContext } from '@/features/prompt-actions/types';

/**
 * Payload for starting a prompt action
 */
export interface StartActionPayload {
  /** Action ID to execute */
  actionId: string;

  /** Context for broker resolution */
  context: ExecuteActionContext;

  /** User-provided variable overrides (highest precedence) */
  userProvidedVariables?: Record<string, string>;

  /** Initial message (for chat-based actions) */
  initialMessage?: string;

  /** Existing run ID (for continuing conversations) */
  runId?: string;
}

/**
 * Execute a prompt action with broker resolution
 * 
 * @example
 * ```typescript
 * const result = await dispatch(startPromptAction({
 *   actionId: 'generate-brief-uuid',
 *   context: {
 *     userId: 'user-uuid',
 *     workspaceId: 'workspace-uuid',
 *     projectId: 'project-uuid'
 *   },
 *   userProvidedVariables: {
 *     // Optional: override any variable
 *     client_name: 'Custom Client Name'
 *   }
 * })).unwrap();
 * 
 * ```
 */
export const startPromptAction = createAsyncThunk<
  ActionExecutionResult,
  StartActionPayload,
  {
    dispatch: AppDispatch;
    state: RootState;
  }
>(
  'promptExecution/startAction',
  async (payload, { dispatch, getState }) => {
    const {
      actionId,
      context,
      userProvidedVariables = {},
      initialMessage = '',
      runId,
    } = payload;

    try {
      // ========== STEP 1: Load Action (Cache-Aware) ==========
      let state = getState();
      let action = selectCachedAction(state, actionId);

      if (!action) {
        const fetchStatus = selectActionFetchStatus(state, actionId);

        if (fetchStatus === 'loading') {
          throw new Error('Action is already being fetched. Please try again.');
        }

        dispatch(setFetchStatus({ actionId, status: 'loading' }));

        const actionData = await getAction(actionId);

        if (!actionData) {
          dispatch(setFetchError({
            actionId,
            error: 'Action not found',
          }));
          throw new Error(`Action not found: ${actionId}`);
        }

        // Cache the action
        dispatch(cacheAction(actionData));
        
        // Re-fetch from state to get the cached version with metadata
        state = getState();
        action = selectCachedAction(state, actionId);
        
        if (!action) {
          throw new Error('Failed to cache action');
        }
        
        console.log('✅ Action cached:', action.name);
      } else {
        console.log('✅ Action loaded from cache:', action.name);
      }

      // ========== STEP 2: Get Referenced Prompt ==========
      const promptId = action.prompt_id || action.prompt_builtin_id;
      const promptSource: 'prompts' | 'prompt_builtins' = action.prompt_id 
        ? 'prompts' 
        : 'prompt_builtins';
      
      if (!promptId) {
        throw new Error('Action has no prompt reference');
      }

      state = getState();
      const prompt = selectCachedPrompt(state, promptId);

      if (!prompt) {
        // The prompt will be fetched by startPromptInstance
        // We just verify it exists in the action
        console.log('ℹ️ Prompt not cached, will be fetched by execution engine');
      } else {
        console.log('✅ Prompt loaded from cache:', prompt.name, `(${promptSource})`);
      }

      // ========== STEP 3: Resolve Brokers ==========
      const brokerIds = Object.values(action.broker_mappings);
      let brokerValues: Record<string, any> = {};
      let brokerResolvedCount = 0;

      if (brokerIds.length > 0) {
        console.log('🔍 Resolving', brokerIds.length, 'brokers for action:', action.name);

        try {
          const resolution = await resolveBrokersForContext(brokerIds, {
            userId: context.userId,
            organizationId: context.organizationId,
            workspaceId: context.workspaceId,
            projectId: context.projectId,
            taskId: context.taskId,
            aiRunId: context.aiRunId,
            aiTaskId: context.aiTaskId,
          });

          brokerValues = resolution.values;
          brokerResolvedCount = Object.keys(brokerValues).length;

          console.log('✅ Resolved', brokerResolvedCount, 'brokers');
          console.log('📊 Scope levels:', resolution.metadata.scopeLevels);
        } catch (error) {
          console.error('⚠️ Broker resolution failed:', error);
          // Continue execution with empty broker values
          // Variables will fall back to defaults or user input
        }
      }

      // ========== STEP 4: Map Brokers to Variables ==========
      const resolvedVariables: Record<string, string> = {};

      Object.entries(action.broker_mappings).forEach(([varName, brokerId]) => {
        if (brokerValues[brokerId] !== undefined && brokerValues[brokerId] !== null) {
          // Convert value to string for variable replacement
          const value = brokerValues[brokerId];
          resolvedVariables[varName] = typeof value === 'object'
            ? JSON.stringify(value)
            : String(value);

          console.log(`🔗 Mapped broker "${brokerId}" → variable "${varName}":`, resolvedVariables[varName]);
        }
      });

      // ========== STEP 5: Build Final Variables ==========
      // Precedence: User Input > Hardcoded > Broker > (Prompt Default handled in engine)
      const finalVariables = {
        ...resolvedVariables,         // From brokers (lowest)
        ...action.hardcoded_values,   // From action config (medium)
        ...userProvidedVariables,     // From user input (highest)
      };

      const userProvidedCount = Object.keys(userProvidedVariables).length;
      const totalVariableCount = Object.keys(finalVariables).length;


      // ========== STEP 6: Execute via Standard Engine ==========

      const createdRunId = await dispatch(
        startPromptInstance({
          promptId,
          promptSource,
          variables: finalVariables,
          executionConfig: {
            auto_run: action.execution_config.auto_run,
            allow_chat: action.execution_config.allow_chat,
            show_variables: action.execution_config.show_variables,
            apply_variables: action.execution_config.apply_variables,
            track_in_runs: action.execution_config.track_in_runs,
          },
          initialMessage,
          runId,
        })
      ).unwrap();

      // ========== STEP 7: Build Result ==========
      const result: ActionExecutionResult = {
        runId: createdRunId,
        brokerResolvedCount,
        userProvidedCount,
        totalVariableCount,
        fullyResolved: brokerResolvedCount === brokerIds.length,
      };


      return result;
    } catch (error) {
      console.error('❌ Failed to execute action:', error);
      throw error;
    }
  }
);

