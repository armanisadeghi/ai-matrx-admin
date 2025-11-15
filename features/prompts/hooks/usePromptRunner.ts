/**
 * usePromptRunner Hook
 * 
 * Centralized hook for opening/closing prompt runner modals via Redux.
 * Replaces the need for local state management (usePromptRunnerModal).
 * 
 * Features:
 * - Automatic prompt caching (fetch once per session)
 * - Global modal management (single instance)
 * - Simple API (just call openPrompt)
 * - No prop drilling or local state
 * 
 * @example
 * ```tsx
 * const { openPrompt, closePrompt, isOpen } = usePromptRunner();
 * 
 * // Open with prompt ID (auto-caches) - New execution config
 * openPrompt({
 *   promptId: 'text-analyzer',
 *   executionConfig: {
 *     auto_run: true,
 *     allow_chat: true,
 *     show_variables: false,
 *     apply_variables: true
 *   },
 *   variables: { text: selectedText }
 * });
 * 
 * // Open with prompt data (skip cache)
 * openPrompt({
 *   promptData: myPrompt,
 *   executionConfig: {
 *     auto_run: false,
 *     allow_chat: true,
 *     show_variables: true,
 *     apply_variables: false
 *   },
 *   variables: { topic: 'AI' }
 * });
 * 
 * // Close modal
 * closePrompt();
 * ```
 */

"use client";

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/lib/redux/hooks';
import { openPrompt } from '@/lib/redux/thunks/openPromptThunk';
import { closePromptModal, selectIsPromptModalOpen, selectPromptModalConfig } from '@/lib/redux/slices/promptRunnerSlice';
import { PromptRunnerModalConfig } from '../types/modal';

export interface UsePromptRunnerReturn {
  /** Open a prompt runner modal with configuration */
  openPrompt: (config: PromptRunnerModalConfig) => Promise<void>;
  
  /** Close the active prompt runner modal */
  closePrompt: () => void;
  
  /** Is the prompt modal currently open */
  isOpen: boolean;
  
  /** Current modal configuration (if open) */
  config: PromptRunnerModalConfig | null;
}

/**
 * Hook for managing prompt runner modals via Redux
 */
export function usePromptRunner(): UsePromptRunnerReturn {
  const dispatch = useAppDispatch();
  const isOpen = useAppSelector(selectIsPromptModalOpen);
  const config = useAppSelector(selectPromptModalConfig);

  const openPromptModal = useCallback(async (modalConfig: PromptRunnerModalConfig) => {
    await dispatch(openPrompt(modalConfig)).unwrap();
  }, [dispatch]);

  const closePromptModalHandler = useCallback(() => {
    dispatch(closePromptModal());
  }, [dispatch]);

  return {
    openPrompt: openPromptModal,
    closePrompt: closePromptModalHandler,
    isOpen,
    config,
  };
}

/**
 * Simplified function to open a prompt imperatively
 * For use outside of React components
 * 
 * @example
 * ```tsx
 * import { openPromptImperative, store } from '@/lib/redux/store';
 * 
 * openPromptImperative(store.dispatch, {
 *   promptId: 'text-analyzer',
 *   variables: { text: selectedText }
 * });
 * ```
 */
export function openPromptImperative(
  dispatch: any,
  config: PromptRunnerModalConfig
): Promise<void> {
  return dispatch(openPrompt(config)).unwrap();
}

