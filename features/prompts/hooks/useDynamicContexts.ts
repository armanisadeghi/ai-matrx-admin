/**
 * useDynamicContexts Hook
 * 
 * Hook for managing dynamic contexts in a prompt execution.
 * Provides easy access to context state and update operations.
 * 
 * @example
 * ```typescript
 * const { contexts, addContext, updateContext, removeContext } = useDynamicContexts(runId);
 * 
 * // Add a new context
 * addContext('file_1', codeContent, { type: 'code', language: 'typescript' });
 * 
 * // Update context with new version
 * updateContext('file_1', updatedCode, 'Added error handling');
 * ```
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import {
  initializeDynamicContext,
  removeDynamicContext,
} from '@/lib/redux/prompt-execution/slice';
import {
  selectDynamicContexts,
  selectDynamicContext,
  selectHasDynamicContexts,
  selectDynamicContextIds,
  selectDynamicContextCount,
} from '@/lib/redux/prompt-execution/selectors';
import { updateDynamicContextVersion } from '@/lib/redux/prompt-execution/thunks/updateDynamicContextThunk';
import type { ContextMetadata } from '@/lib/redux/prompt-execution/types/dynamic-context';

/**
 * Hook for managing dynamic contexts in a prompt execution
 * 
 * @param runId - The execution run ID
 * @returns Context management functions and state
 */
export function useDynamicContexts(runId: string) {
  const dispatch = useAppDispatch();
  
  // Selectors
  const contexts = useAppSelector(state => selectDynamicContexts(state, runId));
  const hasContexts = useAppSelector(state => selectHasDynamicContexts(state, runId));
  const contextIds = useAppSelector(state => selectDynamicContextIds(state, runId));
  const contextCount = useAppSelector(state => selectDynamicContextCount(state, runId));
  
  /**
   * Add a new context
   * 
   * @param contextId - Unique identifier for the context
   * @param content - Initial content
   * @param metadata - Context metadata (type, language, etc.)
   */
  const addContext = useCallback((
    contextId: string,
    content: string,
    metadata: ContextMetadata
  ) => {
    dispatch(initializeDynamicContext({
      runId,
      contextId,
      content,
      metadata,
    }));
  }, [runId, dispatch]);
  
  /**
   * Update a context with a new version
   * 
   * @param contextId - Context to update
   * @param content - New content
   * @param summary - Optional summary of changes
   */
  const updateContext = useCallback(async (
    contextId: string,
    content: string,
    summary?: string
  ) => {
    await dispatch(updateDynamicContextVersion({
      runId,
      contextId,
      content,
      summary,
    })).unwrap();
  }, [runId, dispatch]);
  
  /**
   * Remove a context
   * 
   * @param contextId - Context to remove
   */
  const removeContext = useCallback((contextId: string) => {
    dispatch(removeDynamicContext({ runId, contextId }));
  }, [runId, dispatch]);
  
  /**
   * Get a specific context by ID
   * 
   * @param contextId - Context to retrieve
   */
  const getContext = useCallback((contextId: string) => {
    return selectDynamicContext({ promptExecution: { dynamicContexts: { [runId]: contexts } } } as any, runId, contextId);
  }, [runId, contexts]);
  
  return {
    // State
    contexts,
    hasContexts,
    contextIds,
    contextCount,
    
    // Actions
    addContext,
    updateContext,
    removeContext,
    getContext,
  };
}

/**
 * Hook for a specific dynamic context
 * 
 * @param runId - The execution run ID
 * @param contextId - The context ID
 * @returns Context state and update function
 */
export function useDynamicContext(runId: string, contextId: string) {
  const dispatch = useAppDispatch();
  
  // Selector for specific context
  const context = useAppSelector(state => selectDynamicContext(state, runId, contextId));
  
  /**
   * Update this context with a new version
   * 
   * @param content - New content
   * @param summary - Optional summary of changes
   */
  const updateContext = useCallback(async (
    content: string,
    summary?: string
  ) => {
    await dispatch(updateDynamicContextVersion({
      runId,
      contextId,
      content,
      summary,
    })).unwrap();
  }, [runId, contextId, dispatch]);
  
  return {
    context,
    updateContext,
    exists: context !== null,
  };
}

