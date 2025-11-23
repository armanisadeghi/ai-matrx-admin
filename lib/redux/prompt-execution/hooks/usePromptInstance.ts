/**
 * usePromptInstance Hook
 * 
 * Convenience hook for accessing prompt execution instance state and actions.
 * Provides a clean API for components to interact with the execution engine.
 */

import { useCallback } from 'react';
import { useAppSelector, useAppDispatch } from '@/lib/redux';
import {
  selectInstance,
  selectDisplayMessages,
  selectMergedVariables,
  selectIsReadyToExecute,
  selectStreamingTextForInstance,
  selectInstanceStats,
  selectLiveStreamingStats,
  updateVariable,
  updateVariables,
  setCurrentInput,
  clearConversation,
  setExpandedVariable,
  toggleShowVariables,
} from '../index';
import { executeMessage } from '../thunks/executeMessageThunk';

export function usePromptInstance(runId: string | null) {
  const dispatch = useAppDispatch();

  // ========== SELECTORS ==========
  const instance = useAppSelector((state) =>
    runId ? selectInstance(state, runId) : null
  );

  const displayMessages = useAppSelector((state) =>
    runId ? selectDisplayMessages(state, runId) : []
  );

  const variables = useAppSelector((state) =>
    runId ? selectMergedVariables(state, runId) : {}
  );

  const isReady = useAppSelector((state) =>
    runId ? selectIsReadyToExecute(state, runId) : false
  );

  const streamingText = useAppSelector((state) =>
    runId ? selectStreamingTextForInstance(state, runId) : ''
  );

  const stats = useAppSelector((state) =>
    runId ? selectInstanceStats(state, runId) : null
  );

  const liveStats = useAppSelector((state) =>
    runId ? selectLiveStreamingStats(state, runId) : null
  );

  // ========== ACTIONS ==========
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

  const setInput = useCallback(
    (input: string) => {
      if (!runId) return;
      dispatch(setCurrentInput({ runId, input }));
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

  // ========== COMPUTED VALUES ==========
  const isExecuting =
    instance?.status === 'executing' || instance?.status === 'streaming';
  const isStreaming = instance?.status === 'streaming';
  const hasError = instance?.status === 'error';
  const currentInput = instance?.conversation.currentInput || '';

  return {
    // State
    instance,
    displayMessages,
    variables,
    isReady,
    isExecuting,
    isStreaming,
    hasError,
    streamingText,
    stats,
    liveStats,
    currentInput,
    runId,

    // Actions
    sendMessage,
    updateVariable: updateVar,
    updateVariables: updateVars,
    setInput,
    clearConversation: clearChat,
    setExpandedVariable: setExpanded,
    toggleShowVariables: toggleVars,
  };
}

