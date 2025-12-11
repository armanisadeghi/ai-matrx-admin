/**
 * submitPreExecutionThunk.ts
 * 
 * Handles submission from the pre-execution input modal.
 * Executes the prompt and routes to the appropriate result display.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState, AppDispatch } from '../store';
import {
  closePreExecutionModal,
  openPromptModal,
  openCompactModal,
  openSidebarResult,
  openFlexiblePanel,
  openInlineOverlay,
  addToastResult,
} from '../slices/promptRunnerSlice';
import { executeMessage } from '../prompt-execution/thunks/executeMessageThunk';
import { selectPrimaryResponseEndedByTaskId, selectPrimaryResponseTextByTaskId } from '../socket-io/selectors/socket-response-selectors';

export const submitPreExecution = createAsyncThunk<
  void,
  void,
  {
    dispatch: AppDispatch;
    state: RootState;
  }
>(
  'promptExecution/submitPreExecution',
  async (_, { dispatch, getState }) => {
    const state = getState() as RootState;
    const { config, targetResultDisplay } = state.promptRunner?.preExecutionModal || {};
    
    if (!config || !targetResultDisplay || !config.runId) {
      throw new Error('No pre-execution config found');
    }
    
    const runId = config.runId;
    
    // Close pre-execution modal
    dispatch(closePreExecutionModal());
    
    // Get prompt data from instance if needed
    const instance = state.promptExecution?.instances[runId];
    if (!instance) {
      throw new Error('Execution instance not found');
    }
    
    // Build finalPromptData from instance
    const finalPromptData = {
      id: instance.promptId,
      name: instance.promptName,
      description: '',
      messages: instance.messages,
      variableDefaults: instance.variableDefaults,
      settings: instance.settings,
    };
    
    // Update config with the finalPromptData
    const updatedConfig = {
      ...config,
      promptData: finalPromptData,
    };
    
    // ============================================================================
    // Route to Display Type and Execute
    // ============================================================================
    switch (targetResultDisplay) {
      case 'modal-full':
        // Open modal with runId
        dispatch(openPromptModal(updatedConfig));
        
        // Execute the prompt
        await dispatch(executeMessage({ runId }));
        break;

      case 'modal-compact':
        // Open compact modal with runId
        dispatch(openCompactModal(updatedConfig));
        
        // Execute the prompt
        await dispatch(executeMessage({ runId }));
        break;

      case 'sidebar':
        // Open sidebar with runId
        dispatch(openSidebarResult({
          config: updatedConfig,
          position: (config as any).sidebarPosition || 'right',
          size: (config as any).sidebarSize || 'md',
        }));
        
        // Execute the prompt
        await dispatch(executeMessage({ runId }));
        break;

      case 'flexible-panel':
        // Open flexible panel with runId
        dispatch(openFlexiblePanel({
          config: updatedConfig,
          position: (config as any).sidebarPosition || 'right',
        }));
        
        // Execute the prompt
        await dispatch(executeMessage({ runId }));
        break;

      case 'inline': {
        // Execute via unified system
        const taskId = await dispatch(executeMessage({ runId })).unwrap();
        
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
        const finalState = getState() as RootState;
        const result = selectPrimaryResponseTextByTaskId(taskId)(finalState);

        // Show inline overlay with result
        dispatch(openInlineOverlay({
          result: result || '',
          taskId: taskId,
          originalText: (config as any).originalText || '',
          promptName: finalPromptData.name,
          isStreaming: false,
          callbacks: {
            onReplace: (config as any).onTextReplace,
            onInsertBefore: (config as any).onTextInsertBefore,
            onInsertAfter: (config as any).onTextInsertAfter,
          },
        }));
        break;
      }

      case 'toast': {
        // Execute via unified system
        const taskId = await dispatch(executeMessage({ runId })).unwrap();

        // Show toast immediately with taskId (will stream in real-time)
        dispatch(addToastResult({
          result: '', // Start with empty result
          promptName: finalPromptData.name,
          duration: 5000,
          promptData: finalPromptData,
          executionConfig: instance.executionConfig,
          runId: runId,
          taskId: taskId,
          isStreaming: true,
        }));
        break;
      }

      case 'direct': {
        // Execute via unified system (no UI)
        const taskId = await dispatch(executeMessage({ runId })).unwrap();

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
        const finalState = getState() as RootState;
        const response = selectPrimaryResponseTextByTaskId(taskId)(finalState);
        
        // Call completion callback if provided
        const onExecutionComplete = (config as any).onExecutionComplete;
        if (onExecutionComplete) {
          onExecutionComplete({ response, metadata: {} });
        }
        break;
      }

      case 'background': {
        // Execute silently via unified system
        const taskId = await dispatch(executeMessage({ runId })).unwrap();

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
        const finalState = getState() as RootState;
        const response = selectPrimaryResponseTextByTaskId(taskId)(finalState);
        
        // Call completion callback if provided
        const onExecutionComplete = (config as any).onExecutionComplete;
        if (onExecutionComplete) {
          onExecutionComplete({ response, metadata: {} });
        }
        break;
      }

      default:
        throw new Error(`Unknown result_display type: ${targetResultDisplay}`);
    }
  }
);

