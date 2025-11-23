/**
 * usePromptAction Hook
 * 
 * Simplifies interaction with prompt actions from React components.
 * Provides methods to execute actions and track their state.
 */

import { useCallback, useState } from 'react';
import { useAppDispatch } from '@/lib/redux';
import { startPromptAction, type StartActionPayload } from '@/lib/redux/prompt-execution';
import type { ActionExecutionResult } from '../types';

/**
 * Hook for executing and managing prompt actions
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { executeAction, loading, error, result } = usePromptAction();
 * 
 *   const handleClick = async () => {
 *     const result = await executeAction({
 *       actionId: 'action-uuid',
 *       context: {
 *         userId: currentUserId,
 *         projectId: currentProjectId
 *       }
 *     });
 *     
 *     if (result) {
 *       console.log('Executed:', result.runId);
 *     }
 *   };
 * 
 *   return (
 *     <button onClick={handleClick} disabled={loading}>
 *       {loading ? 'Executing...' : 'Run Action'}
 *     </button>
 *   );
 * }
 * ```
 */
export function usePromptAction() {
  const dispatch = useAppDispatch();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ActionExecutionResult | null>(null);

  /**
   * Execute a prompt action
   */
  const executeAction = useCallback(
    async (payload: StartActionPayload): Promise<ActionExecutionResult | null> => {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const executionResult = await dispatch(startPromptAction(payload)).unwrap();
        setResult(executionResult);
        return executionResult;
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to execute action';
        setError(errorMessage);
        console.error('Action execution failed:', err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [dispatch]
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Clear result state
   */
  const clearResult = useCallback(() => {
    setResult(null);
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setResult(null);
  }, []);

  return {
    executeAction,
    loading,
    error,
    result,
    clearError,
    clearResult,
    reset,
  };
}

/**
 * Extended hook with action caching and pre-loading
 * 
 * @example
 * ```typescript
 * function ActionButton({ actionId }: { actionId: string }) {
 *   const { executeAction, loading } = usePromptActionWithCache(actionId);
 * 
 *   return (
 *     <button
 *       onClick={() => executeAction({
 *         context: { userId: 'user-uuid' }
 *       })}
 *       disabled={loading}
 *     >
 *       Execute
 *     </button>
 *   );
 * }
 * ```
 */
export function usePromptActionWithCache(actionId: string) {
  const { executeAction: baseExecute, ...rest } = usePromptAction();

  const executeAction = useCallback(
    async (options: Omit<StartActionPayload, 'actionId'>) => {
      return baseExecute({
        ...options,
        actionId,
      });
    },
    [baseExecute, actionId]
  );

  return {
    executeAction,
    ...rest,
  };
}

