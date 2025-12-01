/**
 * System Actions - Hardcoded Definitions
 * 
 * This file contains hardcoded action definitions for testing.
 * In production, these will come from the database.
 */

import { MatrxAction } from '../types';

export const SYSTEM_ACTIONS: MatrxAction[] = [
  // ========================================
  // Standalone Actions (Top-level)
  // ========================================
  {
    id: 'explain',
    name: 'Explain',
    description: 'Explain the selected text in simple terms',
    icon: 'MessageSquare',
    actionType: 'prompt',
    promptId: 'f7c71520-ca08-42e8-85f9-44f444290998', // Real prompt ID for explain
    resultType: 'multi-turn', // Enable multi-turn conversation
    variableContextMap: {
      content_to_explain: {
        source: 'selection',
        fallback: 'editor_content',
        required: true,
        label: 'Content to explain'
      }
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'summarize',
    name: 'Summarize',
    description: 'Create a concise summary',
    icon: 'FileText',
    actionType: 'prompt',
    promptId: 'summarize-text',
    variableContextMap: {
      text: {
        source: 'selection',
        fallback: 'editor_content',
        required: true,
        label: 'Text to summarize'
      },
      style: {
        source: 'manual_input',
        default: 'concise',
        prompt: 'Summary style',
        label: 'Style'
      }
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'extract-key-points',
    name: 'Extract Key Points',
    description: 'Extract the main points from text',
    icon: 'ListChecks',
    actionType: 'prompt',
    promptId: 'extract-key-points',
    variableContextMap: {
      text: {
        source: 'selection',
        fallback: 'editor_content',
        required: true,
        label: 'Text to analyze'
      }
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'improve',
    name: 'Improve',
    description: 'Improve the writing quality',
    icon: 'Sparkles',
    actionType: 'prompt',
    promptId: 'improve-writing',
    variableContextMap: {
      text: {
        source: 'selection',
        fallback: 'editor_content',
        required: true,
        label: 'Text to improve'
      }
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'get-ideas',
    name: 'Get Ideas',
    description: 'Generate ideas related to the topic',
    icon: 'Lightbulb',
    actionType: 'prompt',
    promptId: 'generate-ideas',
    variableContextMap: {
      topic: {
        source: 'selection',
        fallback: 'manual_input',
        required: true,
        prompt: 'What topic would you like ideas about?',
        label: 'Topic'
      }
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'search-web',
    name: 'Search Web',
    description: 'Search the web for information',
    icon: 'Search',
    actionType: 'function',
    functionName: 'searchWeb',
    scope: 'system',
    isSystem: true
  },

  // ========================================
  // Matrx Create Actions
  // ========================================
  {
    id: 'create-flashcards',
    name: 'Create Flashcards',
    description: 'Generate flashcards from content',
    icon: 'CreditCard',
    actionType: 'prompt',
    promptId: 'create-flashcards',
    variableContextMap: {
      content: {
        source: 'selection',
        fallback: 'editor_content',
        required: true,
        label: 'Content for flashcards'
      }
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'create-presentation',
    name: 'Create Presentation',
    description: 'Generate a presentation outline',
    icon: 'Presentation',
    actionType: 'prompt',
    promptId: 'create-presentation',
    variableContextMap: {
      topic: {
        source: 'selection',
        fallback: 'manual_input',
        required: true,
        prompt: 'Presentation topic',
        label: 'Topic'
      }
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'create-quiz',
    name: 'Create Quiz',
    description: 'Generate quiz questions',
    icon: 'HelpCircle',
    actionType: 'prompt',
    promptId: 'create-quiz',
    variableContextMap: {
      content: {
        source: 'selection',
        fallback: 'editor_content',
        required: true,
        label: 'Content for quiz'
      }
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'create-flowchart',
    name: 'Create Flow Chart',
    description: 'Generate a flowchart',
    icon: 'GitBranch',
    actionType: 'prompt',
    promptId: 'create-flowchart',
    variableContextMap: {
      process: {
        source: 'selection',
        fallback: 'manual_input',
        required: true,
        prompt: 'Describe the process',
        label: 'Process'
      }
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'create-other',
    name: 'Other',
    description: 'Create other types of content',
    icon: 'Plus',
    actionType: 'prompt',
    promptId: 'create-custom',
    variableContextMap: {
      type: {
        source: 'manual_input',
        required: true,
        prompt: 'What would you like to create?',
        label: 'Content type'
      },
      content: {
        source: 'selection',
        fallback: 'editor_content',
        required: false,
        label: 'Source content'
      }
    },
    scope: 'system',
    isSystem: true
  },

  // ========================================
  // Translation Actions
  // ========================================
  {
    id: 'translate-english',
    name: 'Translate to English',
    description: 'Translate text to English',
    icon: 'Languages',
    actionType: 'prompt',
    promptId: 'translate-text',
    variableContextMap: {
      text: {
        source: 'selection',
        fallback: 'editor_content',
        required: true,
        label: 'Text to translate'
      },
      targetLanguage: {
        source: 'manual_input',
        default: 'English',
        label: 'Target language'
      }
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'translate-spanish',
    name: 'Translate to Spanish',
    description: 'Translate text to Spanish',
    icon: 'Languages',
    actionType: 'prompt',
    promptId: 'translate-text',
    variableContextMap: {
      text: {
        source: 'selection',
        fallback: 'editor_content',
        required: true,
        label: 'Text to translate'
      },
      targetLanguage: {
        source: 'manual_input',
        default: 'Spanish',
        label: 'Target language'
      }
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'translate-french',
    name: 'Translate to French',
    description: 'Translate text to French',
    icon: 'Languages',
    actionType: 'prompt',
    promptId: 'translate-text',
    variableContextMap: {
      text: {
        source: 'selection',
        fallback: 'editor_content',
        required: true,
        label: 'Text to translate'
      },
      targetLanguage: {
        source: 'manual_input',
        default: 'French',
        label: 'Target language'
      }
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'translate-italian',
    name: 'Translate to Italian',
    description: 'Translate text to Italian',
    icon: 'Languages',
    actionType: 'prompt',
    promptId: 'translate-text',
    variableContextMap: {
      text: {
        source: 'selection',
        fallback: 'editor_content',
        required: true,
        label: 'Text to translate'
      },
      targetLanguage: {
        source: 'manual_input',
        default: 'Italian',
        label: 'Target language'
      }
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'translate-persian',
    name: 'Translate to Persian',
    description: 'Translate text to Persian',
    icon: 'Languages',
    actionType: 'prompt',
    promptId: '3446e556-b6c5-4322-960a-e36fe0eff17c', // Real prompt ID for Persian translation
    resultType: 'single-turn', // Single-turn result (default)
    variableContextMap: {
      text_to_translate: { // Match the actual variable name in your prompt
        source: 'selection',
        fallback: 'editor_content',
        required: true,
        label: 'Text to translate'
      }
      // Note: targetLanguage is hardcoded in the prompt, so we don't need it here
    },
    scope: 'system',
    isSystem: true
  },
  {
    id: 'translate-other',
    name: 'Other Language',
    description: 'Translate to another language',
    icon: 'Languages',
    actionType: 'prompt',
    promptId: 'translate-text',
    variableContextMap: {
      text: {
        source: 'selection',
        fallback: 'editor_content',
        required: true,
        label: 'Text to translate'
      },
      targetLanguage: {
        source: 'manual_input',
        required: true,
        prompt: 'Enter target language',
        label: 'Target language'
      }
    },
    scope: 'system',
    isSystem: true
  }
];

/**
 * Helper to get an action by ID
 */
export function getActionById(id: string): MatrxAction | undefined {
  return SYSTEM_ACTIONS.find(action => action.id === id);
}

/**
 * Helper to get actions by type
 */
export function getActionsByType(type: MatrxAction['actionType']): MatrxAction[] {
  return SYSTEM_ACTIONS.filter(action => action.actionType === type);
}

