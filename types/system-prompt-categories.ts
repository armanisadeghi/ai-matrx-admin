/**
 * System Prompt Categories
 * 
 * Defines the different categories of system prompts and their required variables.
 * Each category enforces specific variable requirements for consistency.
 */

export interface SystemPromptCategory {
    id: string;
    name: string;
    description: string;
    requiredVariables: string[];
    optionalVariables?: string[];
    icon?: string;
    placementTypes: ('card' | 'context-menu' | 'button')[];
    examples?: string[];
}

/**
 * All available system prompt categories
 */
export const SYSTEM_PROMPT_CATEGORIES: Record<string, SystemPromptCategory> = {
    'content-expander': {
        id: 'content-expander',
        name: 'Content Expander',
        description: 'Cards that expand on content with title, description, and full context. Perfect for educational content, glossaries, and explanations.',
        requiredVariables: ['title', 'description', 'context'],
        optionalVariables: [],
        icon: 'BookOpen',
        placementTypes: ['card'],
        examples: [
            'Educational vocabulary cards',
            'Historical concept explanations',
            'Technical term glossaries',
            'Product feature details',
        ],
    },
    
    'code-analyzer': {
        id: 'code-analyzer',
        name: 'Code Analyzer',
        description: 'Analyzes code snippets for improvements, bugs, or explanations. Expects current code as input.',
        requiredVariables: ['current_code'],
        optionalVariables: ['language', 'framework'],
        icon: 'Code',
        placementTypes: ['card', 'context-menu', 'button'],
        examples: [
            'Code review assistant',
            'Bug detector',
            'Code explanation',
            'Refactoring suggestions',
        ],
    },
    
    'text-processor': {
        id: 'text-processor',
        name: 'Text Processor',
        description: 'Processes selected or provided text. Works with context menus for text selection.',
        requiredVariables: ['text'],
        optionalVariables: ['context'],
        icon: 'FileText',
        placementTypes: ['context-menu', 'button'],
        examples: [
            'Summarize text',
            'Improve writing',
            'Translate',
            'Extract key points',
        ],
    },
    
    'content-generator': {
        id: 'content-generator',
        name: 'Content Generator',
        description: 'Generates content based on topic and parameters. Flexible content creation.',
        requiredVariables: ['topic'],
        optionalVariables: ['tone', 'length', 'style', 'audience'],
        icon: 'Sparkles',
        placementTypes: ['card', 'button'],
        examples: [
            'Article generator',
            'Social media posts',
            'Email templates',
            'Product descriptions',
        ],
    },
    
    'data-analyzer': {
        id: 'data-analyzer',
        name: 'Data Analyzer',
        description: 'Analyzes data or content with context. Provides insights and analysis.',
        requiredVariables: ['data', 'context'],
        optionalVariables: ['analysis_type'],
        icon: 'BarChart',
        placementTypes: ['card', 'button'],
        examples: [
            'Data insights',
            'Trend analysis',
            'Report summaries',
            'Comparison analysis',
        ],
    },
    
    'custom': {
        id: 'custom',
        name: 'Custom',
        description: 'Custom configuration with flexible variable requirements. Use when none of the predefined categories fit.',
        requiredVariables: [],
        optionalVariables: [],
        icon: 'Settings',
        placementTypes: ['card', 'context-menu', 'button'],
        examples: [
            'Unique workflows',
            'Specialized prompts',
            'Experimental features',
        ],
    },
};

/**
 * Get category by ID
 */
export function getCategoryById(id: string): SystemPromptCategory | undefined {
    return SYSTEM_PROMPT_CATEGORIES[id];
}

/**
 * Get all categories as array
 */
export function getAllCategories(): SystemPromptCategory[] {
    return Object.values(SYSTEM_PROMPT_CATEGORIES);
}

/**
 * Get categories that support a specific placement type
 */
export function getCategoriesByPlacement(placementType: 'card' | 'context-menu' | 'button'): SystemPromptCategory[] {
    return getAllCategories().filter(cat => cat.placementTypes.includes(placementType));
}

/**
 * Validate that a prompt's variables match a category's requirements
 */
export function validatePromptVariables(
    promptVariables: string[],
    category: SystemPromptCategory
): { valid: boolean; missing: string[]; extra: string[] } {
    const missing = category.requiredVariables.filter(v => !promptVariables.includes(v));
    
    // For custom category, no extra variables check
    if (category.id === 'custom') {
        return { valid: missing.length === 0, missing, extra: [] };
    }
    
    const allowedVariables = [
        ...category.requiredVariables,
        ...(category.optionalVariables || []),
    ];
    
    const extra = promptVariables.filter(v => !allowedVariables.includes(v));
    
    return {
        valid: missing.length === 0 && extra.length === 0,
        missing,
        extra,
    };
}

/**
 * Get a human-readable description of variable requirements
 */
export function getCategoryVariableDescription(category: SystemPromptCategory): string {
    const parts: string[] = [];
    
    if (category.requiredVariables.length > 0) {
        parts.push(`Required: ${category.requiredVariables.map(v => `{{${v}}}`).join(', ')}`);
    }
    
    if (category.optionalVariables && category.optionalVariables.length > 0) {
        parts.push(`Optional: ${category.optionalVariables.map(v => `{{${v}}}`).join(', ')}`);
    }
    
    if (parts.length === 0) {
        return 'No specific variables required';
    }
    
    return parts.join(' | ');
}

