import { PromptMessage, PromptVariable, PromptSettings } from "@/features/prompts/types/core";

/**
 * Prompt source type - determines which table the prompt comes from
 */
export type PromptSourceType = 'prompt' | 'template' | 'builtin';

/**
 * Universal prompt data structure that works with all three tables
 * Maps to: prompts, prompt_templates, prompt_builtins
 */
export interface UniversalPromptData {
    id?: string;
    name: string;
    description?: string;
    messages: PromptMessage[];
    variable_defaults?: PromptVariable[];
    tools?: string[];
    settings?: PromptSettings & { model_id?: string };
    
    // Source tracking
    sourceType: PromptSourceType;
    
    // Table-specific fields (optional, for context only)
    category?: string; // prompt_templates only
    is_active?: boolean; // prompt_builtins only
    is_featured?: boolean; // prompt_templates only
    source_prompt_id?: string; // prompt_builtins only
}

/**
 * Props for the UniversalPromptEditor component
 */
export interface UniversalPromptEditorProps {
    /** Whether the editor modal is open */
    isOpen: boolean;
    
    /** Callback when the editor is closed without saving */
    onClose: () => void;
    
    /** The prompt data to edit */
    promptData: UniversalPromptData;
    
    /** Array of available AI models */
    models: any[];
    
    /** Array of available tools (optional) */
    availableTools?: any[];
    
    /** Callback when the user saves changes */
    onSave: (updatedPrompt: UniversalPromptData) => void | Promise<void>;
    
    /** Whether the save operation is in progress */
    isSaving?: boolean;
    
    /** Optional initial selection for the editor */
    initialSelection?: { type: 'system'; index: -1 } | { type: 'message'; index: number } | { type: 'settings' } | { type: 'variables' } | { type: 'tools' } | null;
}

/**
 * Helper function to normalize prompt data from database records
 */
export function normalizePromptData(
    record: any,
    sourceType: PromptSourceType
): UniversalPromptData {
    return {
        id: record.id,
        name: record.name || '',
        description: record.description || '',
        messages: record.messages || [],
        variable_defaults: record.variable_defaults || [],
        tools: Array.isArray(record.tools) ? record.tools : (record.settings?.tools || []),
        settings: record.settings || {},
        sourceType,
        category: record.category,
        is_active: record.is_active,
        is_featured: record.is_featured,
        source_prompt_id: record.source_prompt_id,
    };
}

/**
 * Helper function to prepare prompt data for database update
 * Removes source-tracking and read-only fields
 */
export function denormalizePromptData(data: UniversalPromptData): Record<string, any> {
    const { sourceType, ...dbData } = data;
    
    // Clean up undefined/null values
    const cleanData: Record<string, any> = {
        name: dbData.name,
        description: dbData.description || null,
        messages: dbData.messages,
        variable_defaults: dbData.variable_defaults || [],
        settings: dbData.settings || {},
    };
    
    // Add tools to settings if they exist
    if (dbData.tools && dbData.tools.length > 0) {
        cleanData.settings = {
            ...cleanData.settings,
            tools: dbData.tools,
        };
    }
    
    // Include table-specific fields if present
    if (dbData.category !== undefined) {
        cleanData.category = dbData.category;
    }
    if (dbData.is_active !== undefined) {
        cleanData.is_active = dbData.is_active;
    }
    if (dbData.is_featured !== undefined) {
        cleanData.is_featured = dbData.is_featured;
    }
    if (dbData.source_prompt_id !== undefined) {
        cleanData.source_prompt_id = dbData.source_prompt_id;
    }
    
    return cleanData;
}

