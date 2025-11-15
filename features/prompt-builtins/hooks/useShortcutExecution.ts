/**
 * useShortcutExecution
 * 
 * Hook for executing prompt shortcuts with scope mapping.
 * Uses the shortcut's configured execution_context and modal_mode.
 * Integrates with usePromptExecution for actual prompt running.
 */

'use client';

import { useCallback } from 'react';
import { usePromptExecution } from '@/features/prompts/hooks/usePromptExecution';
import { usePromptRunner } from '@/features/prompts/hooks/usePromptRunner';
import { mapScopeToVariables } from '../utils/execution';
import { requiresModalUI, requiresInlineUI } from '../types';
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
  const { execute, streamingText, isExecuting, error } = usePromptExecution();
  const { openPrompt } = usePromptRunner();

  const executeShortcut = useCallback(
    async (
      shortcut: PromptShortcut & { prompt_builtin: PromptBuiltin | null },
      context: ShortcutExecutionContext
    ) => {
      const { scopes } = context;

      // Check if prompt builtin exists
      if (!shortcut.prompt_builtin) {
        throw new Error(`Shortcut "${shortcut.label}" has no connected prompt builtin`);
      }

      const builtin = shortcut.prompt_builtin;

      // Map application scopes to prompt variables using scope_mappings
      // Convert scopes to ApplicationScope-compatible format
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

      // Use the shortcut's configured result_display to determine behavior
      const resultDisplay = shortcut.result_display || 'modal-full';

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

      // Handle different result display types
      if (requiresInlineUI(resultDisplay)) {
        // Execute and return result for inline text manipulation
        const result = await execute({
          promptData,
          variables: finalVariables,
        });

        return result;
      } else if (requiresModalUI(resultDisplay)) {
        // Use new execution config directly (no legacy mode conversion)
        const executionConfig = {
          auto_run: shortcut.auto_run,
          allow_chat: shortcut.allow_chat,
          show_variables: shortcut.show_variables,
          apply_variables: shortcut.apply_variables,
        };

        // Open in modal via Redux prompt runner
        openPrompt({
          promptData,
          variables: finalVariables,
          executionConfig,
          title: shortcut.label,
          initialMessage: '', // Always set to empty for now
        });

        return null;
      } else if (resultDisplay === 'background') {
        // Execute silently in background
        const result = await execute({
          promptData,
          variables: finalVariables,
        });

        return result;
      } else if (resultDisplay === 'toast') {
        // Execute and show result in toast (implement later)
        const result = await execute({
          promptData,
          variables: finalVariables,
        });

        // TODO: Show result in toast notification
        return result;
      }

      return null;
    },
    [execute, openPrompt]
  );

  return {
    executeShortcut,
    streamingText,
    isExecuting,
    error,
  };
}

