/**
 * useProgrammaticPromptExecution Hook
 * 
 * Clean React hook for programmatic prompt execution.
 * Demonstrates best practices for executing prompts programmatically.
 * 
 * This hook proves that our Redux architecture allows ANY prompt execution
 * scenario to be handled programmatically without requiring UI interactions.
 * 
 * @example Basic usage
 * ```tsx
 * const { executePrompt } = useProgrammaticPromptExecution();
 * 
 * const handleAnalyze = async () => {
 *   await executePrompt({
 *     promptId: 'text-analyzer',
 *     executionConfig: {
 *       result_display: 'modal-compact',
 *       auto_run: true,
 *       allow_chat: false,
 *       show_variables: false,
 *       apply_variables: true,
 *       track_in_runs: true,
 *     },
 *     variables: { text: selectedText },
 *   });
 * };
 * ```
 * 
 * @example With resources and callbacks
 * ```tsx
 * await executePrompt({
 *   promptId: 'image-analyzer',
 *   executionConfig: {
 *     result_display: 'direct',
 *     auto_run: true,
 *     allow_chat: true,
 *     show_variables: false,
 *     apply_variables: true,
 *     track_in_runs: false,
 *   },
 *   resources: [
 *     { type: 'image', url: imageUrl, name: 'screenshot.png' }
 *   ],
 *   initialMessage: 'Describe this image',
 *   onExecutionComplete: (result) => {
 *     console.log('Analysis:', result.response);
 *   }
 * });
 * ```
 */

"use client";

import { useCallback } from 'react';
import { useAppDispatch } from '@/lib/redux/hooks';
import { openPromptExecution } from '@/lib/redux/thunks/openPromptExecutionThunk';
import type { PromptExecutionConfig } from '@/features/prompt-builtins/types/execution-modes';
import type { Resource } from '@/features/prompts/types/resources';

export interface ProgrammaticPromptExecutionOptions {
  /** Prompt identifier */
  promptId: string;
  
  /** Source table (defaults to 'prompts') */
  promptSource?: 'prompts' | 'prompt_builtins';
  
  /** Complete execution configuration (includes result_display and all behavior settings) */
  executionConfig: PromptExecutionConfig;
  
  /** Variable values */
  variables?: Record<string, string>;
  
  /** Resources to attach (files, images, URLs, etc.) */
  resources?: Resource[];
  
  /** Initial message */
  initialMessage?: string;
  
  /** Inline-specific callbacks */
  onTextReplace?: (text: string) => void;
  onTextInsertBefore?: (text: string) => void;
  onTextInsertAfter?: (text: string) => void;
  originalText?: string;
  
  /** Sidebar-specific options */
  sidebarPosition?: 'left' | 'right';
  sidebarSize?: 'sm' | 'md' | 'lg';
  
  /** Completion callback for direct/background modes */
  onExecutionComplete?: (result: { response: string; metadata?: any }) => void;
  
  /** Modal title (defaults to prompt name) */
  title?: string;
}

export interface UseProgrammaticPromptExecutionReturn {
  /**
   * Execute a prompt programmatically with full control
   * 
   * This method:
   * 1. Sets up complete execution context (variables, resources, input)
   * 2. Opens the specified display type
   * 3. Auto-executes if configured
   * 
   * Returns the runId for monitoring/control
   */
  executePrompt: (options: ProgrammaticPromptExecutionOptions) => Promise<string>;
  
  /**
   * Execute a prompt directly (no UI) and get the result
   * 
   * Shorthand for: executePrompt with result_display: 'direct' in executionConfig
   */
  executePromptDirect: (
    options: Omit<ProgrammaticPromptExecutionOptions, 'executionConfig'> & {
      executionConfig: Omit<PromptExecutionConfig, 'result_display'>;
    }
  ) => Promise<{ runId: string; response: string; metadata?: any }>;
}

/**
 * Hook for programmatic prompt execution
 * 
 * Provides a clean API for executing prompts programmatically,
 * proving that our Redux architecture handles both UI and programmatic
 * scenarios identically.
 */
export function useProgrammaticPromptExecution(): UseProgrammaticPromptExecutionReturn {
  const dispatch = useAppDispatch();

  /**
   * Execute a prompt with full control over all parameters
   */
  const executePrompt = useCallback(async (options: ProgrammaticPromptExecutionOptions): Promise<string> => {
    const {
      promptId,
      promptSource = 'prompts',
      executionConfig,
      variables = {},
      resources = [],
      initialMessage = '',
      onTextReplace,
      onTextInsertBefore,
      onTextInsertAfter,
      originalText,
      sidebarPosition,
      sidebarSize,
      onExecutionComplete,
      title,
    } = options;

    const { result_display, ...executionBehavior } = executionConfig;


    const result = await dispatch(openPromptExecution({
      promptId,
      promptSource,
      executionConfig: executionBehavior,
      variables,
      resources,
      initialMessage,
      result_display,
      title,
      onTextReplace,
      onTextInsertBefore,
      onTextInsertAfter,
      originalText,
      sidebarPosition,
      sidebarSize,
      onExecutionComplete,
    })).unwrap();

    // openPromptExecution returns runId
    const runId = typeof result === 'string' ? result : result?.runId || '';
              
    return runId;
  }, [dispatch]);

  /**
   * Direct execution - no UI, just returns the result
   */
  const executePromptDirect = useCallback(async (
    options: Omit<ProgrammaticPromptExecutionOptions, 'executionConfig'> & {
      executionConfig: Omit<PromptExecutionConfig, 'result_display'>;
    }
  ): Promise<{ runId: string; response: string; metadata?: any }> => {
    return new Promise((resolve, reject) => {
      executePrompt({
        ...options,
        executionConfig: {
          ...options.executionConfig,
          result_display: 'direct',
        },
        onExecutionComplete: (result) => {
          resolve({
            runId: '', // TODO: Get runId from result
            response: result.response,
            metadata: result.metadata,
          });
        },
      }).catch(reject);
    });
  }, [executePrompt]);

  return {
    executePrompt,
    executePromptDirect,
  };
}

