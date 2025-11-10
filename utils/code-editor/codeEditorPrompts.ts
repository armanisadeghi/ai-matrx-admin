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

/**
 * Available code editor prompts
 */
export const CODE_EDITOR_PROMPTS = {
  PROMPT_APP_UI: {
    id: 'f6649577-aa9e-4b81-afef-47f11a6bef1b',
    name: 'Prompt App Editor',
    description: 'Specialized for editing React components for Prompt Apps',
    useCase: 'prompt-app-ui',
  },
  GENERIC_CODE: {
    id: '55cc4ad1-bafd-4b82-af0b-4b4f40406ca3',
    name: 'Code Editor',
    description: 'General-purpose code editor for any programming language',
    useCase: 'generic',
  },
} as const;

/**
 * Get the appropriate prompt ID based on context
 */
export function getCodeEditorPromptId(context: 'prompt-app-ui' | 'generic' | string): string {
  switch (context) {
    case 'prompt-app-ui':
      return CODE_EDITOR_PROMPTS.PROMPT_APP_UI.id;
    case 'generic':
      return CODE_EDITOR_PROMPTS.GENERIC_CODE.id;
    default:
      // Default to generic
      return CODE_EDITOR_PROMPTS.GENERIC_CODE.id;
  }
}

/**
 * Get prompt metadata
 */
export function getPromptMetadata(promptId: string): CodeEditorPrompt | undefined {
  return Object.values(CODE_EDITOR_PROMPTS).find(p => p.id === promptId);
}

