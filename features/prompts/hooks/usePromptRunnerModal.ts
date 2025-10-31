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
 * // Auto-run with pre-filled variables
 * promptModal.open({
 *   promptId: 'text-analyzer',
 *   mode: 'auto-run',
 *   variables: { text: selectedText }
 * });
 * 
 * // Manual mode with editable variables
 * promptModal.open({
 *   promptData: myPrompt,
 *   mode: 'manual-with-visible-variables',
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

