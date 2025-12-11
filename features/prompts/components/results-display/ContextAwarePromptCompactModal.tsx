"use client";

import React, { useEffect } from "react";
import type { PromptData } from '@/features/prompts/types/core';
import type { PromptExecutionConfig } from '@/features/prompt-builtins/types/execution-modes';
import { useAppDispatch } from '@/lib/redux/hooks';
import { startPromptInstance } from '@/lib/redux/prompt-execution/thunks/startInstanceThunk';
import { openPromptExecution } from '@/lib/redux/thunks/openPromptExecutionThunk';
import { useDynamicContexts } from '@/features/prompts/hooks/useDynamicContexts';

export interface ContextAwarePromptCompactModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptData?: PromptData;
  promptId?: string;
  executionConfig?: Omit<PromptExecutionConfig, 'result_display'>;
  title?: string;
  customMessage?: string;
  countdownSeconds?: number;
  
  /** Initial context content */
  initialContext: string;
  
  /** Context ID (defaults to 'primary_context') */
  contextId?: string;
  
  /** Context metadata */
  contextType?: 'code' | 'text' | 'json' | 'markdown' | 'other';
  contextLanguage?: string;
  contextFilename?: string;
  contextLabel?: string;
  
  /** Callback when context is updated (after applying changes) */
  onContextChange?: (newContent: string, version: number) => void;
  
  /** Callback for each AI response completion */
  onResponseComplete?: (result: { response: string; runId?: string; metadata?: any }) => void;
  
  /** Callback to receive the updateContext function */
  onContextUpdateReady?: (updateFn: (content: string, summary?: string) => void) => void;
  
  /** Other static variables (non-context) */
  staticVariables?: Record<string, string>;
}

/**
 * ContextAwarePromptCompactModal
 * 
 * Compact, draggable modal with dynamic context version management.
 * NOW POWERED BY REDUX! Uses the unified execution system with dynamic contexts.
 * 
 * Perfect for code editing while viewing the source!
 * 
 * Note: This component doesn't render the modal directly - it creates the execution
 * instance and calls openPromptExecution which triggers OverlayController to render
 * the PromptCompactModal with the proper runId.
 */
export function ContextAwarePromptCompactModal({
  isOpen,
  onClose,
  promptData,
  promptId: providedPromptId,
  executionConfig = {
    auto_run: true,
    allow_chat: true,
    show_variables: false,
    apply_variables: true,
    track_in_runs: false,
    use_pre_execution_input: false,
  },
  title,
  customMessage,
  countdownSeconds,
  initialContext,
  contextId = 'primary_context',
  contextType = 'code',
  contextLanguage,
  contextFilename,
  contextLabel,
  onContextChange,
  onResponseComplete,
  onContextUpdateReady,
  staticVariables = {},
}: ContextAwarePromptCompactModalProps) {
  const dispatch = useAppDispatch();
  const [currentRunId, setCurrentRunId] = React.useState<string | null>(null);
  const { updateContext, getContext } = useDynamicContexts(currentRunId || '');
  
  // Determine promptId to use
  const promptId = providedPromptId || promptData?.id;
  
  // Initialize execution with context when modal opens
  useEffect(() => {
    if (isOpen && !currentRunId && promptId) {
      // Start execution with initial context using startPromptInstance + openPromptExecution
      (async () => {
        try {
          // Create instance with contexts
          const newRunId = await dispatch(startPromptInstance({
            promptId,
            executionConfig: {
              auto_run: false, // Don't auto-run until modal is opened
              allow_chat: true,
              show_variables: false,
              apply_variables: true,
              track_in_runs: false,
              use_pre_execution_input: false,
              ...executionConfig,
            },
            variables: staticVariables,
            initialMessage: customMessage,
            initialContexts: [
              {
                contextId,
                content: initialContext,
                metadata: {
                  type: contextType,
                  language: contextLanguage,
                  filename: contextFilename,
                  label: contextLabel,
                },
              },
            ],
          })).unwrap();
          
          setCurrentRunId(newRunId);
          
          // Open in compact modal with auto-run
          await dispatch(openPromptExecution({
            promptId,
            runId: newRunId,
            result_display: 'modal-compact',
            executionConfig: {
              ...executionConfig,
              auto_run: true, // Now auto-run
            },
            title,
          })).unwrap();
        } catch (error) {
          console.error('Failed to start execution with context:', error);
        }
      })();
    }
  }, [isOpen, currentRunId, promptId, executionConfig, staticVariables, initialContext, contextId, contextType, contextLanguage, contextFilename, contextLabel, customMessage, title, dispatch]);
  
  // Provide updateContext function to parent
  useEffect(() => {
    if (onContextUpdateReady && currentRunId) {
      const updateFn = async (content: string, summary?: string) => {
        try {
          await updateContext(contextId, content, summary);
          
          // Get updated context to notify parent
          const context = getContext(contextId);
          if (context && onContextChange) {
            onContextChange(content, context.currentVersion);
          }
        } catch (error) {
          console.error('Failed to update context:', error);
        }
      };
      
      onContextUpdateReady(updateFn);
    }
  }, [onContextUpdateReady, currentRunId, contextId, updateContext, getContext, onContextChange]);
  
  // Reset runId when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentRunId(null);
    }
  }, [isOpen]);
  
  // The modal is rendered by OverlayController via Redux (openPromptExecution dispatches openCompactModal)
  // This component just handles execution instance creation and context management
  return null;
}

