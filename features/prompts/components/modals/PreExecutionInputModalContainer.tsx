"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { CompactPromptModal } from '../smart/CompactPromptModal';
import { closePreExecutionModal } from '@/lib/redux/slices/promptRunnerSlice';
import { submitPreExecution } from '@/lib/redux/thunks/submitPreExecutionThunk';
import { selectExecutionConfig } from '@/lib/redux/prompt-execution/selectors';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock } from 'lucide-react';

/**
 * PreExecutionInputModalContainer
 * 
 * Container that wraps CompactPromptModal for pre-execution flow.
 * Handles submission routing to the target display type.
 */
export function PreExecutionInputModalContainer() {
  const dispatch = useAppDispatch();
  
  // Get modal state from Redux
  const isOpen = useAppSelector(state => state.promptRunner?.preExecutionModal?.isOpen || false);
  const config = useAppSelector(state => state.promptRunner?.preExecutionModal?.config || null);
  const runId = config?.runId;
  
  // Get execution config for auto_run
  const executionConfig = useAppSelector(state => runId ? selectExecutionConfig(state, runId) : null);
  
  // Auto-run countdown state
  const [countdown, setCountdown] = useState(3);
  const [autoRunActive, setAutoRunActive] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);
  
  // Initialize auto-run countdown when modal opens
  useEffect(() => {
    if (isOpen && executionConfig?.auto_run && !userInteracted) {
      setAutoRunActive(true);
      setCountdown(3);
    } else {
      setAutoRunActive(false);
    }
  }, [isOpen, executionConfig?.auto_run, userInteracted]);
  
  // Countdown effect
  useEffect(() => {
    if (!autoRunActive || !executionConfig?.auto_run || !isOpen) return;
    
    if (countdown === 0) {
      handleSubmit();
      return;
    }
    
    const timer = setTimeout(() => {
      setCountdown(c => c - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [countdown, autoRunActive, executionConfig?.auto_run, isOpen]);
  
  // Stop countdown on any interaction
  const stopCountdown = useCallback(() => {
    if (autoRunActive) {
      setAutoRunActive(false);
      setUserInteracted(true);
    }
  }, [autoRunActive]);
  
  // Handle submission - routes to submitPreExecutionThunk
  const handleSubmit = useCallback(async () => {
    if (!runId) return;
    
    try {
      await dispatch(submitPreExecution()).unwrap();
      // submitPreExecution handles:
      // 1. Closing this modal
      // 2. Executing the prompt
      // 3. Opening the target display type
    } catch (error) {
      console.error('[PreExecutionInputModalContainer] Submission failed:', error);
      // Error is handled in the thunk
    }
  }, [dispatch, runId]);
  
  // Handle cancellation
  const handleCancel = useCallback(() => {
    dispatch(closePreExecutionModal());
    setUserInteracted(false);
    setAutoRunActive(false);
  }, [dispatch]);
  
  // Wrap modal in interaction detector for auto-run countdown
  return (
    <div 
      onMouseEnter={stopCountdown}
      onClick={stopCountdown}
      onKeyDown={stopCountdown}
    >
      <CompactPromptModal
        isOpen={isOpen}
        onClose={handleCancel}
        runId={runId}
        onSubmit={handleSubmit}
        mode="input-only"
      />
      
      {/* Auto-run countdown overlay */}
      {autoRunActive && executionConfig?.auto_run && isOpen && (
        <div className="fixed inset-0 z-[100] pointer-events-none flex items-start justify-center pt-20">
          <div className="bg-background border rounded-lg shadow-lg p-3 space-y-2 pointer-events-auto">
            <Badge variant="secondary" className="gap-1.5 animate-pulse">
              <Clock className="h-3 w-3" />
              Auto-running in {countdown}s
            </Badge>
            <Progress value={((3 - countdown) / 3) * 100} className="h-1" />
          </div>
        </div>
      )}
    </div>
  );
}

