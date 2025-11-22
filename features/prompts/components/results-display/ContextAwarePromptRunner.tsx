"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { PromptRunner, type PromptRunnerProps } from "./PromptRunner";
import { ContextVersionManager, DYNAMIC_CONTEXT_VARIABLE } from "@/features/code-editor/utils/ContextVersionManager";
import type { PromptData } from "@/features/prompts/types/modal";

export interface ContextAwarePromptRunnerProps extends Omit<PromptRunnerProps, 'variables' | 'onExecutionComplete'> {
  /** Initial context content */
  initialContext: string;
  
  /** Context metadata */
  contextType?: 'code' | 'text' | 'json' | 'markdown' | 'other';
  contextLanguage?: string;
  contextFilename?: string;
  
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
 * ContextAwarePromptRunner
 * 
 * Wrapper around PromptRunner that adds dynamic context version management.
 * 
 * Key features:
 * - Maintains versioned context (code, text, etc.)
 * - Injects only current version into each message
 * - Replaces old versions with tombstones
 * - Prevents context window bloat
 * 
 * How it works:
 * 1. User sends message
 * 2. Before API call: inject `dynamic_context` with current version + tombstones
 * 3. AI responds
 * 4. If changes detected: update version and notify parent
 * 5. Repeat - next message gets updated `dynamic_context`
 * 
 * The `dynamic_context` variable is:
 * - Injected before EACH send
 * - Replaced in the prompt template
 * - Contains only ONE full version (current)
 * - Contains tombstones for previous versions
 */
export function ContextAwarePromptRunner({
  initialContext,
  contextType = 'code',
  contextLanguage,
  contextFilename,
  onContextChange,
  onResponseComplete,
  onContextUpdateReady,
  staticVariables = {},
  promptData,
  executionConfig,
  ...otherProps
}: ContextAwarePromptRunnerProps) {
  // Initialize context version manager
  const versionManagerRef = useRef<ContextVersionManager | null>(null);
  
  // Initialize on mount
  useEffect(() => {
    if (!versionManagerRef.current) {
      const manager = new ContextVersionManager(contextType, contextLanguage, contextFilename);
      manager.initialize(initialContext);
      versionManagerRef.current = manager;
    }
  }, []);
  
  // Track current context content for updates
  const [currentContext, setCurrentContext] = useState(initialContext);
  
  // Build variables with dynamic context
  const variables = React.useMemo(() => {
    if (!versionManagerRef.current) {
      return {
        ...staticVariables,
        [DYNAMIC_CONTEXT_VARIABLE]: initialContext,
      };
    }
    
    // Build the context string with current version + tombstones
    const contextString = versionManagerRef.current.buildContextString();
    
    return {
      ...staticVariables,
      [DYNAMIC_CONTEXT_VARIABLE]: contextString,
    };
  }, [staticVariables, currentContext]);
  
  // Handle execution complete - expose response to parent
  const handleExecutionComplete = useCallback((result: { runId: string; response: string; metadata: any }) => {
    // Call parent callback if provided
    if (onResponseComplete) {
      onResponseComplete(result);
    }
    
    // Note: The parent (e.g., ContextAwareCodeEditorModal) will handle
    // edit detection and call our updateContext method when user applies changes
  }, [onResponseComplete]);
  
  // Expose method to update context (called by parent after applying changes)
  const updateContext = useCallback((newContent: string, changesSummary?: string) => {
    if (!versionManagerRef.current) return;
    
    const newVersion = versionManagerRef.current.addVersion(newContent, changesSummary);
    setCurrentContext(newContent);
    
    if (onContextChange) {
      onContextChange(newContent, newVersion.version);
    }
    
    const stats = versionManagerRef.current.getStats();
    console.log(`✅ Context updated to v${newVersion.version}`);
    console.log(`📊 Stats: ${stats.totalVersions} versions, ${stats.staleVersions} stale, current: ${stats.currentContentLength} chars, saved: ${stats.totalHistoricalContentLength} chars`);
  }, [onContextChange]);
  
  // Expose the update method to parent via callback
  useEffect(() => {
    if (onContextUpdateReady) {
      onContextUpdateReady(updateContext);
    }
  }, [updateContext, onContextUpdateReady]);
  
  return (
    <PromptRunner
      {...otherProps}
      promptData={promptData}
      executionConfig={executionConfig}
      variables={variables}
      onExecutionComplete={handleExecutionComplete}
    />
  );
}

