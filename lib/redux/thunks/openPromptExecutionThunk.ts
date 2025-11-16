/**
 * openPromptExecutionThunk.ts
 * 
 * Unified entry point for all prompt executions.
 * Routes to appropriate display type based on result_display configuration.
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '../store';
import type { ResultDisplay, PromptExecutionConfig } from '@/features/prompt-builtins/types/execution-modes';
import type { PromptData } from '@/features/prompts/types/modal';
import {
  openPromptModal,
  openCompactModal,
  openInlineOverlay,
  openSidebarResult,
  openFlexiblePanel,
  addToastResult,
} from '../slices/promptRunnerSlice';
import { cachePrompt } from '../slices/promptCacheSlice';
import { supabase } from '@/utils/supabase/client';
import { executePromptDirect } from './executePromptDirectThunk';

export interface OpenPromptExecutionPayload {
  // Prompt identification
  promptId?: string;
  promptData?: PromptData;
  
  // Execution configuration
  executionConfig: Omit<PromptExecutionConfig, 'result_display'>;
  result_display: ResultDisplay;
  
  // Variables and initial message
  variables?: Record<string, string>;
  initialMessage?: string;
  title?: string;
  runId?: string;
  
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

export const openPromptExecution = createAsyncThunk(
  'promptExecution/open',
  async (payload: OpenPromptExecutionPayload, { dispatch, getState }) => {
    const {
      promptId,
      promptData: initialPromptData,
      executionConfig,
      result_display,
      variables,
      initialMessage,
      title,
      runId,
      onTextReplace,
      onTextInsertBefore,
      onTextInsertAfter,
      originalText,
      sidebarPosition,
      sidebarSize,
      onExecutionComplete,
    } = payload;

    // Step 1: Fetch/cache prompt data if needed
    let finalPromptData: PromptData | undefined = initialPromptData;

    if (promptId && !initialPromptData) {
      const state = getState() as RootState;
      const cachedPrompt = state.promptCache.prompts[promptId];

      if (cachedPrompt) {
        finalPromptData = cachedPrompt;
      } else {
        // Fetch from database
        const { data: prompt, error } = await supabase
          .from('prompts')
          .select('*')
          .eq('id', promptId)
          .single();

        if (error || !prompt) {
          console.error('Failed to fetch prompt:', error?.message);
          throw new Error(`Prompt not found: ${promptId}`);
        }

        // Normalize and cache
        const fetchedPrompt: PromptData = {
          id: prompt.id,
          name: prompt.name,
          description: prompt.description,
          messages: prompt.messages || [],
          variableDefaults: prompt.variable_defaults || [],
          settings: prompt.settings || {},
        };

        dispatch(cachePrompt({
          ...fetchedPrompt,
          fetchedAt: Date.now(),
          status: 'cached' as const,
        }));
        finalPromptData = fetchedPrompt;
      }
    }

    if (!finalPromptData) {
      throw new Error('Either promptId or promptData must be provided');
    }

    // Step 2: Build base modal config (used by modal types)
    const baseModalConfig = {
      promptId,
      promptData: finalPromptData,
      executionConfig,
      variables,
      initialMessage,
      title: title || finalPromptData.name,
      runId,
    };

    // Step 3: Route based on result_display
    switch (result_display) {
      case 'modal-full':
        dispatch(openPromptModal(baseModalConfig));
        break;

      case 'modal-compact':
        dispatch(openCompactModal(baseModalConfig));
        break;

      case 'inline': {
        // For inline, execute first, then show overlay with result
        const result = await dispatch(executePromptDirect({
          promptData: finalPromptData,
          variables: variables || {},
        })).unwrap();

        dispatch(openInlineOverlay({
          result: result.response,
          taskId: result.taskId,
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

      case 'sidebar':
        dispatch(openSidebarResult({
          config: baseModalConfig,
          position: sidebarPosition || 'right',
          size: sidebarSize || 'md',
        }));
        break;

      case 'flexible-panel':
        dispatch(openFlexiblePanel({
          config: baseModalConfig,
          position: sidebarPosition || 'right', // Reuse sidebarPosition for flexible panel
        }));
        break;

      case 'toast': {
        // Execute first, then show toast
        const result = await dispatch(executePromptDirect({
          promptData: finalPromptData,
          variables: variables || {},
        })).unwrap();

        dispatch(addToastResult({
          result: result.response,
          promptName: finalPromptData.name,
          duration: 5000,
        }));

        if (onExecutionComplete) {
          onExecutionComplete(result);
        }
        break;
      }

      case 'direct': {
        // Execute and return result directly (no UI)
        const result = await dispatch(executePromptDirect({
          promptData: finalPromptData,
          variables: variables || {},
        })).unwrap();

        if (onExecutionComplete) {
          onExecutionComplete(result);
        }

        return result;
      }

      case 'background': {
        // Execute silently in background
        const result = await dispatch(executePromptDirect({
          promptData: finalPromptData,
          variables: variables || {},
        })).unwrap();

        if (onExecutionComplete) {
          onExecutionComplete(result);
        }

        return result;
      }

      default:
        throw new Error(`Unknown result_display type: ${result_display}`);
    }

    return null;
  }
);

