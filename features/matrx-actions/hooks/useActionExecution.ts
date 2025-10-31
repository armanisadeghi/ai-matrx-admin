/**
 * useActionExecution Hook
 * 
 * Hook for executing Matrx Actions
 * Bridges the gap between actions and prompt execution
 */

"use client";

import { useCallback, useState, useEffect } from 'react';
import { usePromptExecution } from '@/features/prompts/hooks/usePromptExecution';
import { MatrxAction, AvailableContext } from '../types';
import { actionToPromptConfig, validateActionContext } from '../utils/action-executor';
import { getActionById } from '../constants/system-actions';
import { toast } from 'sonner';

export interface ActionResult {
  actionName: string;
  taskId?: string;
  resultType?: 'single-turn' | 'multi-turn';
  promptConfig?: {
    modelId: string;
    messages: Array<{ role: string; content: string }>;
    modelConfig: Record<string, any>;
  };
}

export interface UseActionExecutionReturn {
  /** Execute an action by ID */
  executeAction: (actionId: string, context: AvailableContext) => Promise<void>;
  
  /** Execute an action object directly */
  executeActionDirect: (action: MatrxAction, context: AvailableContext) => Promise<void>;
  
  /** Current execution state */
  isExecuting: boolean;
  
  /** Streaming text (if any) */
  streamingText: string;
  
  /** Error message (if any) */
  error: string | null;
  
  /** Last result */
  result: ActionResult | null;
  
  /** Clear result */
  clearResult: () => void;
}

/**
 * Hook for executing Matrx Actions
 */
export function useActionExecution(): UseActionExecutionReturn {
  const { execute, isExecuting, streamingText, error, currentTaskId } = usePromptExecution();
  const [result, setResult] = useState<ActionResult | null>(null);
  
  // Store current action for the modal
  const [currentAction, setCurrentAction] = useState<MatrxAction | null>(null);

  const clearResult = useCallback(() => {
    setResult(null);
    setCurrentAction(null);
  }, []);

  const executeActionDirect = useCallback(async (action: MatrxAction, context: AvailableContext) => {
    // Store action for the modal
    setCurrentAction(action);
    try {
      // Validate action type
      if (action.actionType !== 'prompt') {
        toast.error('Action type not supported', {
          description: `Action type "${action.actionType}" is not yet supported. Only prompt-based actions work currently.`
        });
        return;
      }

      // Validate context
      const validation = validateActionContext(action, context);
      if (!validation.valid) {
        toast.error('Cannot execute action', {
          description: validation.error
        });
        return;
      }

      // Convert action to prompt config
      const promptConfig = actionToPromptConfig(action, context);

      // Show brief loading toast
      const loadingToast = toast.loading(`Executing: ${action.name}`, {
        description: 'Streaming results...'
      });

      try {
        // Execute the prompt - this will start streaming immediately
        // The execute function sets currentTaskId internally before streaming starts
        const execResult = await execute(promptConfig);
        
        // Get the taskId that was just set during execution
        // Note: currentTaskId is updated in usePromptExecution during execute()
        const taskIdForResult = execResult.metadata.taskId;

        // Dismiss loading toast
        toast.dismiss(loadingToast);

        if (execResult.success) {
          // Update result with final action name - modal gets text from Redux
          setResult({
            actionName: action.name,
            taskId: taskIdForResult,
            resultType: action.resultType || 'single-turn'
          });

          toast.success(`${action.name} completed`, {
            description: 'Result ready'
          });
        } else {
          // Clear result on error
          setResult(null);
          
          toast.error('Execution failed', {
            description: execResult.error?.message || 'Unknown error occurred'
          });
        }
      } catch (error) {
        toast.dismiss(loadingToast);
        setResult(null);
        throw error;
      }
    } catch (error) {
      console.error('Action execution error:', error);
      toast.error('Execution failed', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    }
  }, [execute]);

  // Effect to open modal when execution starts (when currentTaskId becomes available)
  useEffect(() => {
    if (currentTaskId && isExecuting && !result && currentAction) {
      // Execution has started, open modal immediately
      // Modal will get streaming text directly from Redux using taskId
      setResult({
        actionName: currentAction.name,
        taskId: currentTaskId,
        resultType: currentAction.resultType || 'single-turn',
        promptConfig: undefined // TODO: Pass prompt config for multi-turn
      });
    }
  }, [currentTaskId, isExecuting, result, currentAction]);

  const executeAction = useCallback(async (actionId: string, context: AvailableContext) => {
    // Look up action by ID
    const action = getActionById(actionId);
    
    if (!action) {
      toast.error('Action not found', {
        description: `No action found with ID: ${actionId}`
      });
      return;
    }

    // Execute the action
    await executeActionDirect(action, context);
  }, [executeActionDirect]);

  return {
    executeAction,
    executeActionDirect,
    isExecuting,
    streamingText,
    error,
    result,
    clearResult
  };
}

