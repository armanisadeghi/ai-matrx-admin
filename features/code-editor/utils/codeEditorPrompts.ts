/**
 * Code Editor Prompts Configuration
 * 
 * Centralized configuration for different AI code editing prompts
 */

export interface CodeEditorPrompt {
  id: string;
  name: string;
  description: string;
  useCase: string;
}

export const CODE_EDITOR_PROMPT_BUILTINS = {
  PROMPT_APP_UI: {
    id: 'c1c1f092-ba0d-4d6c-b352-b22fe6c48272',
    name: 'Prompt App Editor',
    description: 'Specialized for editing React components for Prompt Apps',
    useCase: 'prompt-app-ui',
  },
  GENERIC_CODE: {
    id: '87efa869-9c11-43cf-b3a8-5b7c775ee415',
    name: 'Master Code Editor',
    description: 'General-purpose code editor for any programming language',
    useCase: 'generic',
  },
} as const;

/** 
 * Get the appropriate builtin prompt ID based on context 
 */
export function getCodeEditorBuiltinId(context: 'prompt-app-ui' | 'generic' | string): string {
  switch (context) {
    case 'prompt-app-ui':
      return CODE_EDITOR_PROMPT_BUILTINS.PROMPT_APP_UI.id;
    case 'generic':
      return CODE_EDITOR_PROMPT_BUILTINS.GENERIC_CODE.id;
    default:
      // Default to generic
      return CODE_EDITOR_PROMPT_BUILTINS.GENERIC_CODE.id;
  }
}

/**
 * Get builtin prompt metadata
 */
export function getBuiltinMetadata(builtinId: string): CodeEditorPrompt | undefined {
  return Object.values(CODE_EDITOR_PROMPT_BUILTINS).find(p => p.id === builtinId);
}
