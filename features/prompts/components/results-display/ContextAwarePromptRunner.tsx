"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { PromptRunner } from "./PromptRunner";
import { ContextVersionManager, DYNAMIC_CONTEXT_VARIABLE } from "@/features/code-editor/utils/ContextVersionManager";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { startPromptInstance } from "@/lib/redux/prompt-execution/thunks/startInstanceThunk";
import { selectInstance } from "@/lib/redux/prompt-execution/slice";
import { v4 as uuidv4 } from "uuid";
import type { PromptData } from "@/features/prompts/types/core";
import type { NewExecutionConfig } from "@/features/prompts/types/modal";
import { Loader2 } from "lucide-react";

export interface ContextAwarePromptRunnerProps {
  /** Optional: Pre-generated runId (if not provided, one will be generated) */
  runId?: string;
  /** Prompt ID to run */
  promptId?: string;
  /** Prompt data (if available) - will use promptData.id if promptId not provided */
  promptData?: PromptData | null;
  /** Prompt source */
  promptSource?: 'prompts' | 'prompt_builtins';
  /** Execution configuration */
  executionConfig?: Omit<NewExecutionConfig, 'result_display'>;
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
  /** Optional title */
  title?: string;
  /** Optional close handler */
  onClose?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ContextAwarePromptRunner
 * 
 * Wrapper around PromptRunner that adds dynamic context version management.
 * 
 * ARCHITECTURE: This component handles its own initialization by creating
 * a run instance with the appropriate variables including dynamic context.
 * 
 * Key features:
 * - Maintains versioned context (code, text, etc.)
 * - Injects only current version into each message
 * - Replaces old versions with tombstones
 * - Prevents context window bloat
 */
export function ContextAwarePromptRunner({
  runId: providedRunId,
  promptId,
  promptData,
  promptSource = 'prompts',
  executionConfig,
  initialContext,
  contextType = 'code',
  contextLanguage,
  contextFilename,
  onContextChange,
  onResponseComplete,
  onContextUpdateReady,
  staticVariables = {},
  title,
  onClose,
  className,
}: ContextAwarePromptRunnerProps) {
  const dispatch = useAppDispatch();
  
  // Run ID for this instance - use provided or generate
  const [internalRunId, setInternalRunId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);
  
  // Use provided runId if available, otherwise use internal
  const activeRunId = providedRunId || internalRunId;
  
  // Check if instance exists in Redux
  const instance = useAppSelector(state => 
    activeRunId ? selectInstance(state, activeRunId) : null
  );
  
  // Initialize context version manager
  const versionManagerRef = useRef<ContextVersionManager | null>(null);
  
  // Track current context content for updates
  const [currentContext, setCurrentContext] = useState(initialContext);
  
  // Determine which prompt ID to use
  const effectivePromptId = promptId || promptData?.id;
  
  // Initialize context manager on mount
  useEffect(() => {
    if (!versionManagerRef.current) {
      const manager = new ContextVersionManager(contextType, contextLanguage, contextFilename);
      manager.initialize(initialContext);
      versionManagerRef.current = manager;
    }
  }, [contextType, contextLanguage, contextFilename, initialContext]);
  
  // Build variables with dynamic context
  const buildVariables = useCallback(() => {
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
  }, [staticVariables, initialContext]);
  
  // Initialize run instance (only if no providedRunId and no existing instance)
  useEffect(() => {
    // Skip if we already have a runId (provided or internal) or are initializing
    if (activeRunId || isInitializing || !effectivePromptId) return;
    
    const initializeRun = async () => {
      setIsInitializing(true);
      try {
        const newRunId = providedRunId || uuidv4();
        const variables = buildVariables();
        
        await dispatch(startPromptInstance({
          runId: newRunId,
          promptId: effectivePromptId,
          promptSource,
          executionConfig: executionConfig || {
            auto_run: false,
            allow_chat: true,
            show_variables: false,
            apply_variables: true,
            track_in_runs: true,
          },
          variables,
        })).unwrap();
        
        // Only set internal runId if we generated it ourselves
        if (!providedRunId) {
          setInternalRunId(newRunId);
        }
      } catch (error) {
        console.error('[ContextAwarePromptRunner] Failed to initialize:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeRun();
  }, [activeRunId, isInitializing, effectivePromptId, providedRunId, promptSource, executionConfig, buildVariables, dispatch]);
  
  // Handle execution complete - expose response to parent
  const handleExecutionComplete = useCallback((result: { runId: string; response: string; metadata: any }) => {
    if (onResponseComplete) {
      onResponseComplete(result);
    }
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
  
  // Show loading while initializing
  if (!activeRunId || !instance) {
    return (
      <div className={`flex flex-col items-center justify-center h-full gap-4 ${className || ''}`}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Initializing context-aware runner...</p>
      </div>
    );
  }
  
  return (
    <PromptRunner
      runId={activeRunId}
      title={title}
      onClose={onClose}
      onExecutionComplete={handleExecutionComplete}
      className={className}
    />
  );
}

