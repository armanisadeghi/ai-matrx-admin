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
import { createAndSubmitTask } from '../socket-io/thunks/submitTaskThunk';
import { replaceVariablesInText } from '@/features/prompts/utils/variable-resolver';

export interface OpenPromptExecutionPayload {
  // Prompt identification
  promptId?: string;
  promptData?: PromptData;
  
  // Execution configuration
  executionConfig: Omit<PromptExecutionConfig, 'result_display'>;
  result_display: ResultDisplay;
  
  // Display variant for PromptRunner (standard | compact)
  displayVariant?: 'standard' | 'compact';
  
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
      displayVariant,
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
          source: 'prompts' as const,
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
      displayVariant,
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
        // Show toast immediately and stream the response
        const messagesWithVariables = (finalPromptData.messages || []).map(msg => ({
          ...msg,
          content: replaceVariablesInText(msg.content, variables || {})
        }));
        
        const finalMessages = initialMessage
          ? [...messagesWithVariables, { role: 'user' as const, content: initialMessage }]
          : messagesWithVariables;
        
        const chatConfig: Record<string, any> = {
          model_id: finalPromptData.settings?.model_id,
          messages: finalMessages,
          stream: true,
          ...finalPromptData.settings,
        };
        
        // Submit task to get taskId immediately
        const result = await dispatch(createAndSubmitTask({
          service: 'chat_service',
          taskName: 'direct_chat',
          taskData: {
            chat_config: chatConfig
          }
        })).unwrap();

        // Show toast immediately with taskId (will stream in real-time)
        dispatch(addToastResult({
          result: '', // Start with empty result
          promptName: finalPromptData.name,
          duration: 5000,
          promptData: finalPromptData,
          executionConfig,
          taskId: result.taskId,
          isStreaming: true, // Mark as streaming
        }));

        // Optionally wait for completion for onExecutionComplete callback
        if (onExecutionComplete) {
          const completeResult = await dispatch(executePromptDirect({
            promptData: finalPromptData,
            variables: variables || {},
          })).unwrap();
          onExecutionComplete(completeResult);
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

