/**
 * useDiffHandler Hook
 * 
 * Convenience hook for handling AI diff responses in any component
 * Integrates with Redux diff state and provides easy-to-use callbacks
 */

"use client";

import { useCallback } from 'react';
import { useAppDispatch } from '@/lib/redux';
import {
  initializeDiffSession,
  addPendingDiffs,
  acceptDiff,
  rejectDiff,
  acceptAllDiffs,
  rejectAllDiffs,
  undoLastAccept,
  markSaved,
  resetDiffSession,
} from '@/lib/redux/slices/textDiffSlice';
import { parseDiff } from '../lib/parseDiff';
import { useToastManager } from '@/hooks/useToastManager';

export interface UseDiffHandlerOptions {
  onSaveCallback?: (text: string) => void | Promise<void>;
  showToasts?: boolean;
  toastContext?: string;
}

export function useDiffHandler(options: UseDiffHandlerOptions = {}) {
  const {
    onSaveCallback,
    showToasts = true,
    toastContext = 'diff-handler',
  } = options;
  
  const dispatch = useAppDispatch();
  const toast = useToastManager(toastContext);

  /**
   * Initialize a new diff session
   */
  const initialize = useCallback(
    (sourceId: string, sourceType: 'note' | 'custom', initialText: string) => {
      dispatch(
        initializeDiffSession({
          sourceId,
          sourceType,
          initialText,
        })
      );
    },
    [dispatch]
  );

  /**
   * Process an AI response containing diffs
   */
  const processAIResponse = useCallback(
    (response: string) => {
      const parseResult = parseDiff(response);

      if (!parseResult.success) {
        if (showToasts) {
        toast.error(`Failed to parse diff: ${parseResult.error}`);
        }
        return {
          success: false,
          error: parseResult.error,
          diffCount: 0,
        };
      }

      if (parseResult.diffs.length === 0) {
        if (showToasts) {
        toast.warning('No diffs found in response');
        }
        return {
          success: false,
          error: 'No diffs found',
          diffCount: 0,
        };
      }

      dispatch(addPendingDiffs(parseResult.diffs));

      if (showToasts) {
      toast.success(`Successfully parsed ${parseResult.diffs.length} change(s)`);
      }

      return {
        success: true,
        diffCount: parseResult.diffs.length,
        explanation: parseResult.explanation,
      };
    },
    [dispatch, showToasts, toast]
  );

  /**
   * Accept a single diff
   */
  const accept = useCallback(
    (diffId: string) => {
      dispatch(acceptDiff(diffId));
      if (showToasts) {
        toast.success('Change accepted');
      }
    },
    [dispatch, showToasts, toast]
  );

  /**
   * Reject a single diff
   */
  const reject = useCallback(
    (diffId: string, reason?: string) => {
      dispatch(rejectDiff({ diffId, reason }));
      if (showToasts) {
        toast.info('Change rejected');
      }
    },
    [dispatch, showToasts, toast]
  );

  /**
   * Accept all pending diffs
   */
  const acceptAll = useCallback(() => {
    dispatch(acceptAllDiffs());
    if (showToasts) {
      toast.success('All changes accepted');
    }
  }, [dispatch, showToasts, toast]);

  /**
   * Reject all pending diffs
   */
  const rejectAll = useCallback(
    (reason?: string) => {
      dispatch(rejectAllDiffs(reason));
      if (showToasts) {
        toast.info('All changes rejected');
      }
    },
    [dispatch, showToasts, toast]
  );

  /**
   * Undo the last accepted diff
   */
  const undo = useCallback(() => {
    dispatch(undoLastAccept());
    if (showToasts) {
      toast.info('Undid last change');
    }
  }, [dispatch, showToasts, toast]);

  /**
   * Save changes and mark as saved
   */
  const save = useCallback(
    async (currentText: string) => {
      try {
        if (onSaveCallback) {
          await onSaveCallback(currentText);
        }
        
        dispatch(markSaved());
        
        if (showToasts) {
          toast.success('Changes saved');
        }
        
        return { success: true };
      } catch (error) {
        if (showToasts) {
          toast.error(`Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [dispatch, onSaveCallback, showToasts, toast]
  );

  /**
   * Reset/clear the diff session
   */
  const reset = useCallback(() => {
    dispatch(resetDiffSession());
  }, [dispatch]);

  return {
    initialize,
    processAIResponse,
    accept,
    reject,
    acceptAll,
    rejectAll,
    undo,
    save,
    reset,
  };
}

