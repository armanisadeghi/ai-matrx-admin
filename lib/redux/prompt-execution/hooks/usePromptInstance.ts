/**
 * usePromptInstance Hook
 * 
 * Hook for accessing prompt execution instance state and actions.
 * 
 * ARCHITECTURE:
 * - Uses granular selectors to minimize re-renders
 * - Does NOT include high-frequency state (currentInput, resources)
 *   → Components should use selectCurrentInput/setCurrentInput directly
 *   → This prevents the hook's return value from changing on every keystroke
 * - Returns stable references when data is missing (no new arrays/objects)
 * 
 * For high-frequency input state, use directly in components:
 * ```tsx
 * const currentInput = useAppSelector(state => selectCurrentInput(state, runId));
 * const handleChange = (value: string) => dispatch(setCurrentInput({ runId, input: value }));
 * ```
 */

import { useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux';
import {
  // Basic selectors (from slice)
  selectInstance,
  selectUIState,
  selectMessages,
  
  // Memoized selectors (from selectors.ts)
  selectDisplayMessages,
  selectMergedVariables,
  selectIsReadyToExecute,
  selectStreamingTextForInstance,
  selectInstanceStats,
  selectLiveStreamingStats,
  selectIsExecuting,
  selectIsStreaming,
  selectHasError,
  
  // Actions
  updateVariable,
  updateVariables,
  clearConversation,
  setExpandedVariable,
  toggleShowVariables,
  
  // Stable references
  EMPTY_MESSAGES,
  EMPTY_OBJECT,
  DEFAULT_UI_STATE,
} from '../index';
import { executeMessage } from '../thunks/executeMessageThunk';

/**
 * Hook for accessing and interacting with a prompt execution instance
 * 
 * @param runId - The unique identifier for the execution instance (null if not yet created)
 * 
 * NOTE: This hook does NOT include currentInput or setInput.
 * For input handling, use selectors/actions directly in your component:
 * ```tsx
 * // In your input component
 * const currentInput = useAppSelector(state => 
 *   runId ? selectCurrentInput(state, runId) : ''
 * );
 * const handleChange = useCallback((value: string) => {
 *   if (runId) dispatch(setCurrentInput({ runId, input: value }));
 * }, [runId, dispatch]);
 * ```
 * 
 * @example
 * ```tsx
 * function PromptRunner({ runId }) {
 *   const { 
 *     displayMessages,
 *     isExecuting,
 *     sendMessage 
 *   } = usePromptInstance(runId);
 *   
 *   return (
 *     <div>
 *       {displayMessages.map(m => <Message key={m.timestamp} {...m} />)}
 *       <PromptInputField runId={runId} onSubmit={sendMessage} />
 *     </div>
 *   );
 * }
 * ```
 */
export function usePromptInstance(runId: string | null) {
  const dispatch = useAppDispatch();

  // ========== SELECTORS WITH STABLE REFERENCES ==========
  // Each selector returns a stable reference when runId is null
  
  // Core instance (rarely changes after creation)
  const instance = useAppSelector((state) =>
    runId ? selectInstance(state, runId) : null
  );

  // Messages for display (includes streaming message if active)
  // Uses memoized selector - stable reference when runId is null
  const displayMessages = useAppSelector((state) =>
    runId ? selectDisplayMessages(state, runId) : EMPTY_MESSAGES
  );

  // Raw messages (without streaming - for counting, etc.)
  const messages = useAppSelector((state) =>
    runId ? selectMessages(state, runId) : EMPTY_MESSAGES
  );

  // Merged variables for display
  const variables = useAppSelector((state) =>
    runId ? selectMergedVariables(state, runId) : EMPTY_OBJECT
  );

  // Ready state (primitive - always stable)
  const isReady = useAppSelector((state) =>
    runId ? selectIsReadyToExecute(state, runId) : false
  );

  // Streaming text (string primitive - always stable)
  const streamingText = useAppSelector((state) =>
    runId ? selectStreamingTextForInstance(state, runId) : ''
  );

  // Stats (memoized selector)
  const stats = useAppSelector((state) =>
    runId ? selectInstanceStats(state, runId) : null
  );

  const liveStats = useAppSelector((state) =>
    runId ? selectLiveStreamingStats(state, runId) : null
  );

  // UI state (stable default reference)
  const uiState = useAppSelector((state) =>
    runId ? selectUIState(state, runId) : DEFAULT_UI_STATE
  );

  // Execution state (boolean primitives - always stable)
  const isExecuting = useAppSelector((state) =>
    runId ? selectIsExecuting(state, runId) : false
  );

  const isStreaming = useAppSelector((state) =>
    runId ? selectIsStreaming(state, runId) : false
  );

  const hasError = useAppSelector((state) =>
    runId ? selectHasError(state, runId) : false
  );

  // ========== ACTIONS ==========
  
  /**
   * Send a message for execution
   * @param input - Optional input to override currentInput from state
   */
  const sendMessage = useCallback(
    async (input?: string) => {
      if (!runId) return;
      await dispatch(
        executeMessage({ runId, userInput: input })
      ).unwrap();
    },
    [runId, dispatch]
  );

  const updateVar = useCallback(
    (name: string, value: string) => {
      if (!runId) return;
      dispatch(updateVariable({ runId, variableName: name, value }));
    },
    [runId, dispatch]
  );

  const updateVars = useCallback(
    (vars: Record<string, string>) => {
      if (!runId) return;
      dispatch(updateVariables({ runId, variables: vars }));
    },
    [runId, dispatch]
  );

  const clearChat = useCallback(() => {
    if (!runId) return;
    dispatch(clearConversation({ runId }));
  }, [runId, dispatch]);

  const setExpanded = useCallback(
    (variableName: string | null) => {
      if (!runId) return;
      dispatch(setExpandedVariable({ runId, variableName }));
    },
    [runId, dispatch]
  );

  const toggleVars = useCallback(() => {
    if (!runId) return;
    dispatch(toggleShowVariables({ runId }));
  }, [runId, dispatch]);

  return {
    // ========== STATE ==========
    // Core (stable)
    instance,
    runId,
    
    // Messages (stable references)
    displayMessages,
    messages,
    
    // Variables (stable reference)
    variables,
    
    // Status (primitives - always stable)
    isReady,
    isExecuting,
    isStreaming,
    hasError,
    
    // Streaming (string primitive)
    streamingText,
    
    // Stats
    stats,
    liveStats,
    
    // UI state (stable reference)
    expandedVariable: uiState.expandedVariable,
    showVariables: uiState.showVariables,

    // ========== ACTIONS ==========
    sendMessage,
    updateVariable: updateVar,
    updateVariables: updateVars,
    clearConversation: clearChat,
    setExpandedVariable: setExpanded,
    toggleShowVariables: toggleVars,
    
    // NOTE: currentInput/setInput NOT included
    // Use selectCurrentInput and setCurrentInput directly in input components
    // to avoid hook re-renders on every keystroke
  };
}
