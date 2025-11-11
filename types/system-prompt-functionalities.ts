/**
 * System Prompt Functionalities
 * 
 * These are HARDCODED definitions that represent REAL CODE components.
 * Each functionality defines what variables it expects.
 * The code knows how to map UI context to these variables.
 */

export interface FunctionalityDefinition {
  id: string;
  name: string;
  description: string;
  placementTypes: ('context-menu' | 'card' | 'button' | 'modal' | 'link' | 'action')[];
  requiredVariables: string[];
  optionalVariables?: string[];
  examples?: string[];
}

/**
 * All available functionalities that system prompts can plug into
 */
export const SYSTEM_FUNCTIONALITIES: Record<string, FunctionalityDefinition> = {
  // ===== CONTENT CARDS =====
  'content-expander-card': {
    id: 'content-expander-card',
    name: 'Content Expander Card',
    description: 'Cards that expand on educational content with title, description, and full context',
    placementTypes: ['card'],
    requiredVariables: ['title', 'description', 'context'],
    examples: ['Vocabulary term cards', 'Concept explainers', 'Historical figure details']
  },

  // ===== TEXT OPERATIONS =====
  'explain-text': {
    id: 'explain-text',
    name: 'Explain Text',
    description: 'Explain selected text or concept in simple terms',
    placementTypes: ['context-menu', 'button', 'modal'],
    requiredVariables: ['content_to_explain'],
    optionalVariables: ['context'],
    examples: ['Explain selection', 'What is this?', 'Clarify concept']
  },

  'summarize-text': {
    id: 'summarize-text',
    name: 'Summarize Text',
    description: 'Create a concise summary of text',
    placementTypes: ['context-menu', 'button'],
    requiredVariables: ['text'],
    optionalVariables: ['style'],
    examples: ['Summarize selection', 'Quick summary', 'TLDR']
  },

  'translate-text': {
    id: 'translate-text',
    name: 'Translate Text',
    description: 'Translate selected or provided text to another language',
    placementTypes: ['context-menu', 'button'],
    requiredVariables: ['text'],
    optionalVariables: ['target_language', 'source_language'],
    examples: ['Translate to Spanish', 'Translate to French', 'Translate to German']
  },

  'improve-writing': {
    id: 'improve-writing',
    name: 'Improve Writing',
    description: 'Improve the quality and clarity of writing',
    placementTypes: ['context-menu', 'button'],
    requiredVariables: ['text'],
    examples: ['Improve selection', 'Make it better', 'Enhance writing']
  },

  'extract-key-points': {
    id: 'extract-key-points',
    name: 'Extract Key Points',
    description: 'Extract the main points from text',
    placementTypes: ['context-menu', 'button'],
    requiredVariables: ['text'],
    examples: ['Key points', 'Main ideas', 'Bullet summary']
  },

  // ===== CODE OPERATIONS =====
  'analyze-code': {
    id: 'analyze-code',
    name: 'Analyze Code',
    description: 'Analyze code for improvements, bugs, or explanations',
    placementTypes: ['context-menu', 'button'],
    requiredVariables: ['current_code'],
    optionalVariables: ['language', 'framework'],
    examples: ['Find bugs', 'Suggest improvements', 'Explain code', 'Review code']
  },

  'fix-code': {
    id: 'fix-code',
    name: 'Fix Code',
    description: 'Fix issues in code',
    placementTypes: ['context-menu', 'button'],
    requiredVariables: ['current_code'],
    optionalVariables: ['error_message'],
    examples: ['Fix bugs', 'Correct errors', 'Debug code']
  },

  'refactor-code': {
    id: 'refactor-code',
    name: 'Refactor Code',
    description: 'Refactor code for better quality',
    placementTypes: ['context-menu', 'button'],
    requiredVariables: ['current_code'],
    optionalVariables: ['language'],
    examples: ['Clean up code', 'Optimize', 'Improve structure']
  },

  // ===== CONTENT GENERATION =====
  'generate-content': {
    id: 'generate-content',
    name: 'Generate Content',
    description: 'Generate new content based on a topic',
    placementTypes: ['button', 'modal', 'card'],
    requiredVariables: ['topic'],
    optionalVariables: ['tone', 'length', 'style', 'audience'],
    examples: ['Write article', 'Create post', 'Generate description']
  },

  'create-flashcards': {
    id: 'create-flashcards',
    name: 'Create Flashcards',
    description: 'Generate flashcards from content',
    placementTypes: ['context-menu', 'button'],
    requiredVariables: ['content'],
    examples: ['Make flashcards', 'Study cards']
  },

  'create-quiz': {
    id: 'create-quiz',
    name: 'Create Quiz',
    description: 'Generate quiz questions from content',
    placementTypes: ['context-menu', 'button'],
    requiredVariables: ['content'],
    optionalVariables: ['difficulty', 'question_count'],
    examples: ['Make quiz', 'Test questions']
  },

  // ===== UTILITIES =====
  'search-web': {
    id: 'search-web',
    name: 'Search Web',
    description: 'Search the web for information',
    placementTypes: ['context-menu', 'button'],
    requiredVariables: ['query'],
    examples: ['Search for this', 'Look up', 'Find information']
  },

  'get-ideas': {
    id: 'get-ideas',
    name: 'Get Ideas',
    description: 'Generate ideas related to a topic',
    placementTypes: ['context-menu', 'button', 'modal'],
    requiredVariables: ['topic'],
    examples: ['Brainstorm', 'Ideas for...', 'Suggestions']
  },

  // ===== CUSTOM =====
  'custom': {
    id: 'custom',
    name: 'Custom',
    description: 'Custom functionality with flexible variable requirements',
    placementTypes: ['context-menu', 'card', 'button', 'modal', 'link', 'action'],
    requiredVariables: [],
    examples: ['Experimental features', 'One-off actions', 'Special use cases']
  }
};

/**
 * Extract variables from prompt snapshot
 */
export function extractVariablesFromPrompt(promptSnapshot: any): string[] {
  const variables = new Set<string>();
  const regex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
  
  promptSnapshot.messages?.forEach((msg: any) => {
    if (msg.content) {
      let match;
      while ((match = regex.exec(msg.content)) !== null) {
        variables.add(match[1]);
      }
    }
  });
  
  return Array.from(variables);
}

/**
 * Validate that a prompt's variables match a functionality's requirements
 */
export function validatePromptForFunctionality(
  promptSnapshot: any,
  functionalityId: string
): { valid: boolean; missing: string[]; extra: string[] } {
  const functionality = SYSTEM_FUNCTIONALITIES[functionalityId];
  if (!functionality) {
    return { valid: false, missing: [], extra: [] };
  }

  // Extract variables from prompt
  const variables = extractVariablesFromPrompt(promptSnapshot);
  
  // Check required variables
  const missing = functionality.requiredVariables.filter(v => !variables.includes(v));
  
  // For custom, allow anything
  if (functionalityId === 'custom') {
    return { valid: missing.length === 0, missing, extra: [] };
  }
  
  // Check for extra variables
  const allowed = [...functionality.requiredVariables, ...(functionality.optionalVariables || [])];
  const extra = variables.filter(v => !allowed.includes(v));
  
  return {
    valid: missing.length === 0 && extra.length === 0,
    missing,
    extra
  };
}

/**
 * Get functionality by ID
 */
export function getFunctionalityById(id: string): FunctionalityDefinition | undefined {
  return SYSTEM_FUNCTIONALITIES[id];
}

/**
 * Get all functionalities
 */
export function getAllFunctionalities(): FunctionalityDefinition[] {
  return Object.values(SYSTEM_FUNCTIONALITIES);
}

/**
 * Get functionalities that support a specific placement type
 */
export function getFunctionalitiesByPlacementType(
  placementType: string
): FunctionalityDefinition[] {
  return getAllFunctionalities().filter(func => 
    func.placementTypes.includes(placementType as any)
  );
}

