/**
 * openPromptExecutionThunk.ts
 * 
 * Unified entry point for all prompt executions.
 * ALL executions now flow through the Redux execution instance system.
 * 
 * Flow:
 * 1. Fetch/cache prompt data
 * 2. Create execution instance via startPromptInstance (generates runId)
 * 3. Open UI for display type with runId
 * 4. Auto-execute if configured
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../store';
import type { ResultDisplay, PromptExecutionConfig } from '@/features/prompt-builtins/types/execution-modes';
import type { PromptData, PromptDb } from '@/features/prompts/types/core';
import {
  openPromptModal,
  openCompactModal,
  openInlineOverlay,
  openSidebarResult,
  openFlexiblePanel,
  addToastResult,
} from '../slices/promptRunnerSlice';
import { startPromptInstance } from '../prompt-execution/thunks/startInstanceThunk';
import { executeMessage } from '../prompt-execution/thunks/executeMessageThunk';
import { selectPrimaryResponseEndedByTaskId, selectPrimaryResponseTextByTaskId } from '../socket-io/selectors/socket-response-selectors';

export interface OpenPromptExecutionPayload {
  // Prompt identification
  promptId?: string;
  promptData?: PromptData;
  promptSource?: 'prompts' | 'prompt_builtins'; // Which table to fetch from
  
  // Execution configuration (all properties required)
  executionConfig: Omit<PromptExecutionConfig, 'result_display'>;
  result_display: ResultDisplay;
  
  // Variables and initial message
  variables?: Record<string, string>;
  initialMessage?: string;
  title?: string;
  runId?: string;
  
  // Resources (attachments)
  resources?: any[]; // Using any[] to match Resource type from different module
  
  // Inline-specific: text manipulation callbacks
  onTextReplace?: (text: string) => void;
  onTextInsertBefore?: (text: string) => void;
  onTextInsertAfter?: (text: string) => void;
  originalText?: string;
  
  // Sidebar-specific: position and size
  sidebarPosition?: 'left' | 'right';
  sidebarSize?: 'sm' | 'md' | 'lg';
  
  // Callback for completion (background/direct modes)
  onExecutionComplete?: (result: { response: string; metadata?: any }) => void;
}

export const openPromptExecution = createAsyncThunk<
  any,
  OpenPromptExecutionPayload,
  {
    dispatch: AppDispatch;
    state: RootState;
  }
>(
  'promptExecution/open',
  async (payload, { dispatch, getState }) => {
    const {
      promptId,
      promptData: initialPromptData,
      promptSource: providedPromptSource,
      executionConfig,
      result_display,
      variables,
      initialMessage,
      title,
      runId: providedRunId,
      resources,
      onTextReplace,
      onTextInsertBefore,
      onTextInsertAfter,
      originalText,
      sidebarPosition,
      sidebarSize,
      onExecutionComplete,
    } = payload;

    // Validate input
    if (!promptId && !initialPromptData) {
      throw new Error('Either promptId or promptData must be provided');
    }

    const finalPromptId = promptId || initialPromptData?.id || '';
    const promptSource = providedPromptSource || 'prompts'; // Default to 'prompts' for backwards compatibility

    // ============================================================================
    // STEP 1: Create Execution Instance (UNIFIED SYSTEM)
    // ============================================================================
    // ALL display types now create a proper execution instance first
    const createdRunId = await dispatch(startPromptInstance({
      promptId: finalPromptId,
      promptSource,
      executionConfig: executionConfig as any, // startPromptInstance handles internal ExecutionConfig
      variables: variables || {},
      initialMessage: initialMessage || '',
      runId: providedRunId, // Use provided runId if available
      resources: resources || [], // Pass resources to startPromptInstance
    })).unwrap();

    console.log(`✅ Created execution instance: ${createdRunId} for display: ${result_display}`);

    // Get prompt data from the created instance (it's now cached)
    const state = getState() as RootState;
    const instance = state.promptExecution.instances[createdRunId];
    if (!instance) {
      throw new Error('Failed to create execution instance');
    }

    // Build prompt data from instance
    const finalPromptData: PromptData = initialPromptData || {
      id: instance.promptId,
      name: title || 'Prompt',
      description: '',
      messages: instance.messages,
      variableDefaults: instance.variableDefaults,
      settings: instance.settings,
    };

    // ============================================================================
    // STEP 2: Build Modal Config with runId
    // ============================================================================
    const baseModalConfig = {
      promptId: finalPromptId,
      promptData: finalPromptData,
      executionConfig,
      variables,
      initialMessage,
      title: title || finalPromptData.name,
      runId: createdRunId, // ⭐ Now all configs include runId
    };

    // ============================================================================
    // STEP 3: Route to Display Type
    // ============================================================================
    switch (result_display) {
      case 'modal-full':
        // Open modal with runId
        dispatch(openPromptModal(baseModalConfig));
        
        // Auto-execute if configured
        if (executionConfig.auto_run) {
          await dispatch(executeMessage({ runId: createdRunId }));
        }
        break;

      case 'modal-compact':
        // Open compact modal with runId
        dispatch(openCompactModal(baseModalConfig));
        
        // Auto-execute if configured
        if (executionConfig.auto_run) {
          await dispatch(executeMessage({ runId: createdRunId }));
        }
        break;

      case 'sidebar':
        // Open sidebar with runId
        dispatch(openSidebarResult({
          config: baseModalConfig,
          position: sidebarPosition || 'right',
          size: sidebarSize || 'md',
        }));
        
        // Auto-execute if configured
        if (executionConfig.auto_run) {
          await dispatch(executeMessage({ runId: createdRunId }));
        }
        break;

      case 'flexible-panel':
        // Open flexible panel with runId
        dispatch(openFlexiblePanel({
          config: baseModalConfig,
          position: sidebarPosition || 'right',
        }));
        
        // Auto-execute if configured
        if (executionConfig.auto_run) {
          await dispatch(executeMessage({ runId: createdRunId }));
        }
        break;

      case 'inline': {
        // Execute via unified system
        const taskId = await dispatch(executeMessage({ runId: createdRunId })).unwrap();
        
        // Wait for streaming to complete
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            const state = getState() as RootState;
            const isEnded = selectPrimaryResponseEndedByTaskId(taskId)(state);
            
            if (isEnded) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
          
          // Timeout after 5 minutes
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
          }, 5 * 60 * 1000);
        });

        // Get final result
        const state = getState() as RootState;
        const result = selectPrimaryResponseTextByTaskId(taskId)(state);

        // Show inline overlay with result
        dispatch(openInlineOverlay({
          result: result || '',
          taskId: taskId,
          originalText: originalText || '',
          promptName: finalPromptData.name,
          isStreaming: false,
          callbacks: {
            onReplace: onTextReplace,
            onInsertBefore: onTextInsertBefore,
            onInsertAfter: onTextInsertAfter,
          },
        }));
        break;
      }

      case 'toast': {
        // Execute via unified system
        const taskId = await dispatch(executeMessage({ runId: createdRunId })).unwrap();

        // Show toast immediately with taskId (will stream in real-time)
        dispatch(addToastResult({
          result: '', // Start with empty result
          promptName: finalPromptData.name,
          duration: 5000,
          promptData: finalPromptData,
          executionConfig,
          taskId: taskId,
          isStreaming: true,
        }));

        // Optionally wait for completion
        if (onExecutionComplete) {
          // Wait for streaming to complete
          await new Promise<void>((resolve) => {
            const checkInterval = setInterval(() => {
              const state = getState() as RootState;
              const isEnded = selectPrimaryResponseEndedByTaskId(taskId)(state);
              
              if (isEnded) {
                clearInterval(checkInterval);
                resolve();
              }
            }, 100);
            
            setTimeout(() => {
              clearInterval(checkInterval);
              resolve();
            }, 5 * 60 * 1000);
          });

          const state = getState() as RootState;
          const response = selectPrimaryResponseTextByTaskId(taskId)(state);
          onExecutionComplete({ response, metadata: {} });
        }
        
        break;
      }

      case 'direct': {
        // Execute via unified system (no UI)
        const taskId = await dispatch(executeMessage({ runId: createdRunId })).unwrap();

        // Wait for completion
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            const state = getState() as RootState;
            const isEnded = selectPrimaryResponseEndedByTaskId(taskId)(state);
            
            if (isEnded) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
          
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
          }, 5 * 60 * 1000);
        });

        // Get final result
        const state = getState() as RootState;
        const response = selectPrimaryResponseTextByTaskId(taskId)(state);
        
        const result = {
          response,
          taskId,
          metadata: {},
        };

        if (onExecutionComplete) {
          onExecutionComplete(result);
        }

        return result;
      }

      case 'background': {
        // Execute silently via unified system
        const taskId = await dispatch(executeMessage({ runId: createdRunId })).unwrap();

        // Wait for completion
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            const state = getState() as RootState;
            const isEnded = selectPrimaryResponseEndedByTaskId(taskId)(state);
            
            if (isEnded) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
          
          setTimeout(() => {
            clearInterval(checkInterval);
            resolve();
          }, 5 * 60 * 1000);
        });

        // Get final result
        const state = getState() as RootState;
        const response = selectPrimaryResponseTextByTaskId(taskId)(state);
        
        const result = {
          response,
          taskId,
          metadata: {},
        };

        if (onExecutionComplete) {
          onExecutionComplete(result);
        }

        return result;
      }

      default:
        throw new Error(`Unknown result_display type: ${result_display}`);
    }

    return createdRunId;
  }
);

