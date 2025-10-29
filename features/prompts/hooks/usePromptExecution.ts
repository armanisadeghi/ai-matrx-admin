/**
 * usePromptExecution Hook
 * 
 * React hook for executing prompts programmatically with state management
 */

"use client";

import { useState, useCallback, useRef } from 'react';
import { useAppSelector } from '@/lib/redux';
import {
  PromptExecutionConfig,
  ExecutionResult,
  ExecutionProgress,
  ExecutionError,
  UsePromptExecutionReturn
} from '../types/execution';
import { PromptExecutionService } from '../services/prompt-execution-service';

/**
 * Hook for executing prompts programmatically
 */
export function usePromptExecution(): UsePromptExecutionReturn {
  const [isExecuting, setIsExecuting] = useState(false);
  const [progress, setProgress] = useState<ExecutionProgress | null>(null);
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [error, setError] = useState<ExecutionError | null>(null);
  
  const serviceRef = useRef<PromptExecutionService>(new PromptExecutionService());
  
  // Get Redux state for potential use in variable resolution
  const reduxState = useAppSelector(state => state);
  
  // Get broker values for potential use in variable resolution
  const brokerValues = useAppSelector(state => state.broker?.brokers || {});

  /**
   * Execute a prompt with the given configuration
   */
  const execute = useCallback(async (config: PromptExecutionConfig): Promise<ExecutionResult> => {
    // Reset state
    setIsExecuting(true);
    setProgress(null);
    setError(null);
    setResult(null);

    try {
      // Enhance context with Redux state and broker values
      const enhancedConfig: PromptExecutionConfig = {
        ...config,
        context: {
          ...config.context,
          reduxState,
          brokerValues
        }
      };

      // Execute with progress tracking
      const executionResult = await serviceRef.current.execute(
        enhancedConfig,
        (progressUpdate) => {
          setProgress(progressUpdate);
          config.onProgress?.(progressUpdate);
        }
      );

      setResult(executionResult);
      
      if (!executionResult.success && executionResult.error) {
        setError(executionResult.error);
      }

      return executionResult;

    } catch (err) {
      const executionError: ExecutionError = {
        stage: 'execution',
        message: err instanceof Error ? err.message : 'Unknown error',
        details: err
      };
      
      setError(executionError);
      config.onError?.(executionError);

      return {
        success: false,
        text: '',
        metadata: {
          promptId: config.promptId,
          promptName: '',
          taskId: '',
          duration: 0
        },
        error: executionError,
        resolvedVariables: {}
      };

    } finally {
      setIsExecuting(false);
    }
  }, [reduxState, brokerValues]);

  /**
   * Cancel current execution
   */
  const cancel = useCallback(() => {
    serviceRef.current?.cancel();
    setIsExecuting(false);
    setProgress(null);
  }, []);

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setIsExecuting(false);
    setProgress(null);
    setResult(null);
    setError(null);
  }, []);

  return {
    execute,
    isExecuting,
    progress,
    result,
    error,
    reset,
    cancel
  };
}

/**
 * Hook for executing a specific prompt with pre-configured settings
 */
export function usePrompt(promptId: string, baseConfig?: Partial<PromptExecutionConfig>) {
  const { execute, ...rest } = usePromptExecution();

  const executePrompt = useCallback(
    async (overrides?: Partial<PromptExecutionConfig>) => {
      const config: PromptExecutionConfig = {
        promptId,
        ...baseConfig,
        ...overrides
      };
      return execute(config);
    },
    [promptId, baseConfig, execute]
  );

  return {
    execute: executePrompt,
    ...rest
  };
}

