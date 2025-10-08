"use client";

/**
 * Hook to parse and normalize model controls from dynamic API data
 * Keeps snake_case naming for compatibility with Python backend
 */

export interface ControlDefinition {
    type: 'number' | 'integer' | 'boolean' | 'string' | 'enum' | 'array';
    min?: number;
    max?: number;
    default?: any;
    enum?: string[];
    required?: boolean;
}

export interface NormalizedControls {
    // Core controls (snake_case for Python compatibility)
    temperature?: ControlDefinition;
    max_tokens?: ControlDefinition;
    top_p?: ControlDefinition;
    top_k?: ControlDefinition;
    reasoning_effort?: ControlDefinition;
    verbosity?: ControlDefinition;
    reasoning_summary?: ControlDefinition;
    stop_sequences?: ControlDefinition;
    output_format?: ControlDefinition;
    tool_choice?: ControlDefinition;
    
    // Boolean/toggle controls
    store?: ControlDefinition;
    stream?: ControlDefinition;
    parallel_tool_calls?: ControlDefinition;
    
    // Feature flags (allowed property)
    tools?: ControlDefinition;
    image_urls?: ControlDefinition;
    file_urls?: ControlDefinition;
    internal_web_search?: ControlDefinition;
    youtube_videos?: ControlDefinition;
    
    // Raw controls for debugging
    rawControls: Record<string, any>;
    
    // Unmapped controls that we couldn't resolve
    unmappedControls: Record<string, any>;
}

/**
 * Parse and normalize controls from a model's controls object
 */
export function useModelControls(models: any[], selectedModelId: string) {
    // Find the selected model by ID (UUID)
    const selectedModel = models.find((m) => m.id === selectedModelId);
    
    if (!selectedModel) {
        console.error('Model not found:', {
            selectedModelId,
            availableModelIds: models.map(m => m.id),
            models
        });
        return {
            normalizedControls: null,
            selectedModel: null,
            error: `Model not found: ${selectedModelId}`,
        };
    }

    // If no controls, return empty normalized controls (everything disabled)
    if (!selectedModel.controls) {
        return {
            normalizedControls: {
                rawControls: {},
                unmappedControls: {},
            },
            selectedModel,
            error: null,
        };
    }

    const controls = selectedModel.controls;
    const normalized: NormalizedControls = {
        rawControls: controls,
        unmappedControls: {},
    };

    // Known control keys we handle
    const knownKeys = new Set([
        'temperature', 'max_tokens', 'max_output_tokens', 'top_p', 'top_k', 
        'reasoning_effort', 'verbosity', 'reasoning_summary', 'output_format', 'tool_choice',
        'stop_sequences', 'tools', 'stream', 'store', 
        'file_urls', 'image_urls', 'internal_web_search', 'parallel_tool_calls', 'youtube_videos'
    ]);

    // Parse each control
    Object.entries(controls).forEach(([key, value]: [string, any]) => {
        // Track unmapped controls first
        if (!knownKeys.has(key)) {
            normalized.unmappedControls[key] = value;
            return;
        }

        // Handle max_output_tokens alias for max_tokens
        const normalizedKey = key === 'max_output_tokens' ? 'max_tokens' : key;

        // Parse the control definition based on its structure
        const controlDef: ControlDefinition = {
            type: value.type || 'string',
            min: value.min,
            max: value.max,
            default: value.default,
            required: value.required,
        };

        // Handle enum types
        if (value.enum && Array.isArray(value.enum)) {
            controlDef.enum = value.enum;
            controlDef.type = 'enum';
        }
        // Handle "allowed" property (feature flags)
        else if ('allowed' in value) {
            controlDef.type = 'boolean';
            controlDef.default = value.allowed;
        }
        // Handle plain boolean defaults
        else if (typeof value.default === 'boolean') {
            controlDef.type = 'boolean';
        }
        // Infer number types from min/max
        else if (value.min !== undefined || value.max !== undefined) {
            // Check if it's an integer or float based on default
            if (value.default && Number.isInteger(value.default)) {
                controlDef.type = 'integer';
            } else {
                controlDef.type = 'number';
            }
        }

        // Store in normalized controls
        (normalized as any)[normalizedKey] = controlDef;
    });

    return {
        normalizedControls: normalized,
        selectedModel,
        error: null,
    };
}

/**
 * Get default settings from a model's controls
 * Returns ONLY the actual config values that should be submitted/saved
 * UI-only flags (like tools: true) are converted to their proper submission format
 */
export function getModelDefaults(model: any) {
    if (!model?.controls) {
        return {};
    }

    const defaults: Record<string, any> = {};
    const controls = model.controls;

    // Keys that represent UI capabilities, not submission values
    const uiOnlyKeys = new Set(['tools', 'image_urls', 'file_urls', 'internal_web_search', 'youtube_videos']);

    Object.entries(controls).forEach(([key, value]: [string, any]) => {
        // Normalize key
        const normalizedKey = key === 'max_output_tokens' ? 'max_tokens' : key;
        
        // Skip UI-only capability flags - these should be managed separately
        // Tools should be initialized as empty array, not boolean
        if (uiOnlyKeys.has(normalizedKey)) {
            if (normalizedKey === 'tools' && value.allowed) {
                // Initialize tools as empty array if allowed
                defaults[normalizedKey] = [];
            }
            return;
        }
        
        // Extract default value for actual submission parameters
        if (value.default !== undefined) {
            defaults[normalizedKey] = value.default;
        } else if ('allowed' in value && !uiOnlyKeys.has(normalizedKey)) {
            // Only use 'allowed' for non-UI flags
            defaults[normalizedKey] = value.allowed;
        } else if (value.enum && Array.isArray(value.enum) && value.enum.length > 0) {
            defaults[normalizedKey] = value.enum[0];
        }
    });

    return defaults;
}

