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

export function usePromptInstance(instanceId: string | null) {
  const dispatch = useAppDispatch();

  // ========== SELECTORS ==========
  const instance = useAppSelector((state) =>
    instanceId ? selectInstance(state, instanceId) : null
  );

  const displayMessages = useAppSelector((state) =>
    instanceId ? selectDisplayMessages(state, instanceId) : []
  );

  const variables = useAppSelector((state) =>
    instanceId ? selectMergedVariables(state, instanceId) : {}
  );

  const isReady = useAppSelector((state) =>
    instanceId ? selectIsReadyToExecute(state, instanceId) : false
  );

  const streamingText = useAppSelector((state) =>
    instanceId ? selectStreamingTextForInstance(state, instanceId) : ''
  );

  const stats = useAppSelector((state) =>
    instanceId ? selectInstanceStats(state, instanceId) : null
  );

  const liveStats = useAppSelector((state) =>
    instanceId ? selectLiveStreamingStats(state, instanceId) : null
  );

  // ========== ACTIONS ==========
  const sendMessage = useCallback(
    async (input?: string) => {
      if (!instanceId) return;
      await dispatch(
        executeMessage({ instanceId, userInput: input })
      ).unwrap();
    },
    [instanceId, dispatch]
  );

  const updateVar = useCallback(
    (name: string, value: string) => {
      if (!instanceId) return;
      dispatch(updateVariable({ instanceId, variableName: name, value }));
    },
    [instanceId, dispatch]
  );

  const updateVars = useCallback(
    (vars: Record<string, string>) => {
      if (!instanceId) return;
      dispatch(updateVariables({ instanceId, variables: vars }));
    },
    [instanceId, dispatch]
  );

  const setInput = useCallback(
    (input: string) => {
      if (!instanceId) return;
      dispatch(setCurrentInput({ instanceId, input }));
    },
    [instanceId, dispatch]
  );

  const clearChat = useCallback(() => {
    if (!instanceId) return;
    dispatch(clearConversation({ instanceId }));
  }, [instanceId, dispatch]);

  const setExpanded = useCallback(
    (variableName: string | null) => {
      if (!instanceId) return;
      dispatch(setExpandedVariable({ instanceId, variableName }));
    },
    [instanceId, dispatch]
  );

  const toggleVars = useCallback(() => {
    if (!instanceId) return;
    dispatch(toggleShowVariables({ instanceId }));
  }, [instanceId, dispatch]);

  // ========== COMPUTED VALUES ==========
  const isExecuting =
    instance?.status === 'executing' || instance?.status === 'streaming';
  const isStreaming = instance?.status === 'streaming';
  const hasError = instance?.status === 'error';
  const currentInput = instance?.conversation.currentInput || '';
  const runId = instance?.runTracking.runId;

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

