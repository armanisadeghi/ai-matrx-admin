"use client";

import { useState, useCallback } from "react";
import { useAppDispatch } from "@/lib/redux";
import { createTaskFromPresetQuick } from "@/lib/redux/socket-io/thunks/createTaskFromPreset";
import { SocketPresetExecutionConfig } from "../SocketPresetManager";

/**
 * Hook for managing socket preset execution state and logic
 * 
 * This hook:
 * - Manages local execution state (isExecuting, error, taskId)
 * - Provides execute function that uses Redux thunks
 * - Handles callbacks and error management
 * - Returns clean interface for components
 */
export const useSocketPresetExecution = (config: SocketPresetExecutionConfig) => {
  const dispatch = useAppDispatch();
  
  // Local state for execution tracking
  const [isExecuting, setIsExecuting] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Main execution function
  const execute = useCallback(async (dataOverride?: any) => {
    const dataToExecute = dataOverride !== undefined ? dataOverride : config.sourceData;
    
    setIsExecuting(true);
    setError(null);
    setTaskId(null);

    try {
      // Call the onExecuteStart callback
      config.onExecuteStart?.(dataToExecute);

      // Execute through Redux
      const createdTaskId = await dispatch(createTaskFromPresetQuick({
        presetName: config.presetName,
        sourceData: dataToExecute
      })).unwrap();

      // Update state
      setTaskId(createdTaskId);
      
      // Call the onExecuteComplete callback
      config.onExecuteComplete?.(createdTaskId);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      
      // Call the onExecuteError callback
      config.onExecuteError?.(errorMessage);

    } finally {
      setIsExecuting(false);
    }
  }, [dispatch, config]);

  // Reset function to clear state
  const reset = useCallback(() => {
    setIsExecuting(false);
    setTaskId(null);
    setError(null);
  }, []);

  return {
    // State
    isExecuting,
    taskId,
    error,
    
    // Actions
    execute,
    reset,
    
    // Computed
    hasResult: !!taskId,
    hasError: !!error,
  };
};

export default useSocketPresetExecution; 