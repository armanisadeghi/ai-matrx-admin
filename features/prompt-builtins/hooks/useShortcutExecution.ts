/**
 * useShortcutExecution
 * 
 * Hook for executing prompt shortcuts with scope mapping.
 * Uses the shortcut's configured execution_context and modal_mode.
 * Integrates with usePromptExecution for actual prompt running.
 */

'use client';

import { useCallback, useState } from 'react';
import { usePromptRunner } from '@/features/prompts/hooks/usePromptRunner';
import { mapScopeToVariables } from '../utils/execution';
import type { PromptShortcut, PromptBuiltin } from '../types';

export interface ShortcutExecutionContext {
  /** Application-provided scopes (selection, content, context, etc.) */
  scopes: Record<string, string>;
  /** Callback for inline text replacement (used when execution_context='inline') */
  onTextReplace?: (newText: string) => void;
  /** Callback for text insertion before (used when execution_context='inline') */
  onTextInsertBefore?: (text: string) => void;
  /** Callback for text insertion after (used when execution_context='inline') */
  onTextInsertAfter?: (text: string) => void;
}

export function useShortcutExecution() {
  const { openPrompt } = usePromptRunner();
  const [streamingText, setStreamingText] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeShortcut = useCallback(
    async (
      shortcut: PromptShortcut & { prompt_builtin: PromptBuiltin | null },
      context: ShortcutExecutionContext
    ) => {
      const { scopes } = context;
      setError(null);
      setIsExecuting(true);

      try {
        // Check if prompt builtin exists
        if (!shortcut.prompt_builtin) {
          throw new Error(`Shortcut "${shortcut.label}" has no connected prompt builtin`);
        }

        const builtin = shortcut.prompt_builtin;

        // Map application scopes to prompt variables using scope_mappings
        const appScopes = {
          selection: scopes.selection || '',
          content: scopes.content || '',
          context: scopes.context || '',
        };
        
        const variables = mapScopeToVariables(
          appScopes,
          shortcut.scope_mappings || {},
          builtin.variableDefaults || []
        );

        // Build the prompt data object
        const promptData = {
          id: builtin.id,
          name: builtin.name,
          description: builtin.description || undefined,
          messages: builtin.messages,
          variableDefaults: builtin.variableDefaults || undefined,
          settings: builtin.settings,
        };

        // Respect apply_variables flag
        const finalVariables = shortcut.apply_variables ? variables : {};

        // Build execution config
        const executionConfig = {
          auto_run: shortcut.auto_run,
          allow_chat: shortcut.allow_chat,
          show_variables: shortcut.show_variables,
          apply_variables: shortcut.apply_variables,
        };

        // Use the shortcut's configured result_display
        const resultDisplay = shortcut.result_display || 'modal-full';

        // Let the unified system handle all display types
        await openPrompt({
          promptData,
          variables: finalVariables,
          executionConfig,
          result_display: resultDisplay,
          title: shortcut.label,
          initialMessage: '',
          // For inline: pass callbacks
          ...(resultDisplay === 'inline' && {
            onTextReplace: context.onTextReplace,
            onTextInsertBefore: context.onTextInsertBefore,
            onTextInsertAfter: context.onTextInsertAfter,
            originalText: scopes.selection || '',
          }),
        });

        setIsExecuting(false);
        return null;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setIsExecuting(false);
        throw err;
      }
    },
    [openPrompt]
  );

  return {
    executeShortcut,
    streamingText,
    isExecuting,
    error,
  };
}

