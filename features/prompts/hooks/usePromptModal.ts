/**
 * usePromptModal Hook
 * 
 * Convenient hook for using the PromptExecutionModal anywhere in the app
 */

"use client";

import { useState, useCallback } from 'react';

interface UsePromptModalOptions {
  promptId: string;
  promptName?: string;
  defaultValues?: Record<string, string>;
  hideUserInput?: boolean;
  onResult?: (result: string) => void;
}

interface UsePromptModalReturn {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  modalProps: UsePromptModalOptions & {
    isOpen: boolean;
    onClose: () => void;
  };
}

/**
 * Hook for managing prompt execution modal state
 * 
 * @example
 * ```tsx
 * const modal = usePromptModal({
 *   promptId: 'your-prompt-id',
 *   promptName: 'Analyze Data',
 *   onResult: (result) => console.log(result)
 * });
 * 
 * // In your component:
 * <Button onClick={modal.open}>Run Analysis</Button>
 * <PromptExecutionModal {...modal.modalProps} />
 * ```
 */
export function usePromptModal(options: UsePromptModalOptions): UsePromptModalReturn {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

  return {
    isOpen,
    open,
    close,
    toggle,
    modalProps: {
      ...options,
      isOpen,
      onClose: close
    }
  };
}

/**
 * Simple function to open a prompt modal imperatively
 * Useful for one-off executions without managing state
 * 
 * @example
 * ```tsx
 * import { openPromptModal } from '@/features/prompts';
 * 
 * openPromptModal({
 *   promptId: 'analyze-text',
 *   defaultValues: { text: selectedText }
 * });
 * ```
 */
export function openPromptModal(options: Omit<UsePromptModalOptions, 'onResult'> & {
  onResult?: (result: string) => void;
}) {
  // This would need a modal manager/portal system
  // For now, it's a placeholder for future implementation
  console.warn('openPromptModal not yet implemented. Use usePromptModal hook instead.');
  return options;
}

