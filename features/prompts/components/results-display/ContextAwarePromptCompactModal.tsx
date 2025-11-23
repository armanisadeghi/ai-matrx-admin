"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import PromptCompactModal from "./PromptCompactModal-new";
import { ContextVersionManager, DYNAMIC_CONTEXT_VARIABLE } from "@/features/code-editor/utils/ContextVersionManager";
import type { PromptData } from '@/features/prompts/types/modal';
import type { PromptExecutionConfig } from '@/features/prompt-builtins/types/execution-modes';

export interface ContextAwarePromptCompactModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptData?: PromptData;
  executionConfig?: Omit<PromptExecutionConfig, 'result_display'>;
  title?: string;
  customMessage?: string;
  countdownSeconds?: number;
  
  /** Initial context content */
  initialContext: string;
  
  /** Context metadata */
  contextType?: 'code' | 'text' | 'json' | 'markdown' | 'other';
  contextLanguage?: string;
  
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
 * Wraps PromptCompactModal to add V3 context-aware features.
 * 
 * Perfect for code editing while viewing the source!
 */
export function ContextAwarePromptCompactModal({
  isOpen,
  onClose,
  promptData,
  executionConfig,
  title,
  customMessage,
  countdownSeconds,
  initialContext,
  contextType = 'code',
  contextLanguage,
  onContextChange,
  onResponseComplete,
  onContextUpdateReady,
  staticVariables = {},
}: ContextAwarePromptCompactModalProps) {
  const contextManagerRef = useRef<ContextVersionManager | null>(null);
  const [dynamicVariables, setDynamicVariables] = useState<Record<string, string>>({});
  
  // Initialize context manager
  useEffect(() => {
    if (!contextManagerRef.current) {
      contextManagerRef.current = new ContextVersionManager(
        contextType,
        contextLanguage
      );
      contextManagerRef.current.initialize(initialContext);
      
      // Provide initial dynamic_context
      const contextWithTombstones = contextManagerRef.current.buildContextString();
      setDynamicVariables({
        [DYNAMIC_CONTEXT_VARIABLE]: contextWithTombstones,
      });
      
      // Provide updateContext function to parent
      if (onContextUpdateReady) {
        const updateFn = (content: string, summary?: string) => {
          if (contextManagerRef.current) {
            const newVersion = contextManagerRef.current.addVersion(content, summary);
            const newContext = contextManagerRef.current.buildContextString();
            
            // Update dynamic variables for next message
            setDynamicVariables({
              [DYNAMIC_CONTEXT_VARIABLE]: newContext,
            });
            
            // Notify parent of version change
            if (onContextChange) {
              onContextChange(content, newVersion.version);
            }
          }
        };
        onContextUpdateReady(updateFn);
      }
    }
  }, [initialContext, contextType, contextLanguage, onContextChange, onContextUpdateReady]);
  
  // Update dynamic context before each message (in case it was modified externally)
  const handleBeforeSend = useCallback(() => {
    if (contextManagerRef.current) {
      const contextWithTombstones = contextManagerRef.current.buildContextString();
      setDynamicVariables({
        [DYNAMIC_CONTEXT_VARIABLE]: contextWithTombstones,
      });
    }
  }, []);
  
  // Merge static and dynamic variables
  const allVariables = {
    ...staticVariables,
    ...dynamicVariables,
  };
  
  return (
    <PromptCompactModal
      isOpen={isOpen}
      onClose={onClose}
      promptData={promptData}
      executionConfig={executionConfig}
      variables={allVariables}
      title={title}
      onExecutionComplete={onResponseComplete}
      customMessage={customMessage}
      countdownSeconds={countdownSeconds}
    />
  );
}

