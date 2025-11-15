/**
 * usePromptRunnerModal Hook
 * 
 * Manages state for the PromptRunnerModal component
 */

import { useState, useCallback } from 'react';
import {
  UsePromptRunnerModalReturn,
  PromptRunnerModalConfig,
} from '../types/modal';

/**
 * Hook for managing prompt runner modal state
 * 
 * @example
 * ```tsx
 * const promptModal = usePromptRunnerModal();
 * 
 * // Auto-run with pre-filled variables (new execution config)
 * promptModal.open({
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
 * // Manual mode with editable variables (new execution config)
 * promptModal.open({
 *   promptData: myPrompt,
 *   executionConfig: {
 *     auto_run: false,
 *     allow_chat: true,
 *     show_variables: true,
 *     apply_variables: true
 *   },
 *   variables: { topic: 'AI' }
 * });
 * ```
 */
export function usePromptRunnerModal(): UsePromptRunnerModalReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<PromptRunnerModalConfig | null>(null);

  const open = useCallback((modalConfig: PromptRunnerModalConfig) => {
    setConfig(modalConfig);
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    // Keep config until modal animation completes
    setTimeout(() => setConfig(null), 300);
  }, []);

  return {
    isOpen,
    open,
    close,
    config,
  };
}

