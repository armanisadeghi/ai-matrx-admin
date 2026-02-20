"use client";

/**
 * Hook to parse and normalize model controls from dynamic API data
 * Keeps snake_case naming for compatibility with Python backend
 */

export interface ControlDefinition {
    type: 'number' | 'integer' | 'boolean' | 'string' | 'enum' | 'array' | 'string_array' | 'object_array';
    min?: number;
    max?: number;
    default?: any;
    enum?: string[];
    required?: boolean;
}

export interface NormalizedControls {
    // Core controls (snake_case for Python compatibility)
    temperature?: ControlDefinition;
    max_tokens?: ControlDefinition; // Legacy - older APIs
    max_output_tokens?: ControlDefinition; // Modern - preferred
    top_p?: ControlDefinition;
    top_k?: ControlDefinition;
    thinking_budget?: ControlDefinition;
    reasoning_effort?: ControlDefinition;
    verbosity?: ControlDefinition;
    reasoning_summary?: ControlDefinition;
    stop_sequences?: ControlDefinition;
    /** @deprecated DB models may still have output_format — remapped to response_format at parse time */
    output_format?: ControlDefinition;
    tool_choice?: ControlDefinition;

    // Boolean/toggle controls
    store?: ControlDefinition;
    stream?: ControlDefinition;
    parallel_tool_calls?: ControlDefinition;
    include_thoughts?: ControlDefinition;

    // Feature flags (allowed property)
    tools?: ControlDefinition;
    image_urls?: ControlDefinition;
    file_urls?: ControlDefinition;
    internal_web_search?: ControlDefinition;
    internal_url_context?: ControlDefinition;
    youtube_videos?: ControlDefinition;

    // Image/Video model controls
    n?: ControlDefinition;
    seed?: ControlDefinition;
    steps?: ControlDefinition;
    width?: ControlDefinition;
    height?: ControlDefinition;
    guidance_scale?: ControlDefinition;
    negative_prompt?: ControlDefinition;
    response_format?: ControlDefinition;
    fps?: ControlDefinition;
    seconds?: ControlDefinition;
    output_quality?: ControlDefinition;
    image_loras?: ControlDefinition;
    frame_images?: ControlDefinition;
    reference_images?: ControlDefinition;
    disable_safety_checker?: ControlDefinition;

    // Raw controls for debugging
    rawControls: Record<string, any>;

    // Unmapped controls that we couldn't resolve
    unmappedControls: Record<string, any>;
}

/**
 * Parse and normalize controls from a model's controls object
 */
export function useModelControls(models: any[], selectedModelId: string) {
    // If no ID provided, just return empty state without error
    if (!selectedModelId) {
        return {
            normalizedControls: null,
            selectedModel: null,
            error: null,
        };
    }

    // Find the selected model by ID (UUID)
    const selectedModel = models.find((m) => m.id === selectedModelId);

    if (!selectedModel) {
        // Only log error if we have models loaded but still can't find the ID
        if (models.length > 0) {
            console.error('Model not found:', {
                selectedModelId,
                availableModelIds: models.map(m => m.id),
                models
            });
        }
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

    // Defensively parse controls if it was stored as a JSON string (double-encoded)
    let controls = selectedModel.controls;
    if (typeof controls === 'string') {
        try {
            controls = JSON.parse(controls);
        } catch {
            console.error('Failed to parse model controls JSON string for model:', selectedModel.name);
            return {
                normalizedControls: {
                    rawControls: {},
                    unmappedControls: {},
                },
                selectedModel,
                error: `Invalid controls JSON for model: ${selectedModel.name}`,
            };
        }
    }
    // Guard: controls must be a plain object to iterate safely
    if (typeof controls !== 'object' || controls === null || Array.isArray(controls)) {
        console.error('Unexpected controls shape for model:', selectedModel.name, controls);
        return {
            normalizedControls: {
                rawControls: {},
                unmappedControls: {},
            },
            selectedModel,
            error: null,
        };
    }
    const normalized: NormalizedControls = {
        rawControls: controls,
        unmappedControls: {},
    };

    // Known control keys we handle
    const knownKeys = new Set([
        'temperature', 'max_tokens', 'max_output_tokens', 'top_p', 'top_k',
        'thinking_budget', 'include_thoughts', 'internal_url_context',
        'reasoning_effort', 'verbosity', 'reasoning_summary', 'output_format', 'tool_choice',
        'stop_sequences', 'tools', 'stream', 'store',
        'file_urls', 'image_urls', 'internal_web_search', 'parallel_tool_calls', 'youtube_videos',
        // Image/Video model controls
        'n', 'seed', 'steps', 'width', 'height', 'guidance_scale', 'negative_prompt',
        'response_format', 'fps', 'seconds', 'output_quality', 'image_loras',
        'frame_images', 'reference_images', 'disable_safety_checker'
    ]);

    // Parse each control
    Object.entries(controls).forEach(([key, value]: [string, any]) => {
        // Track unmapped controls first
        if (!knownKeys.has(key)) {
            normalized.unmappedControls[key] = value;
            return;
        }

        // Remap output_format -> response_format (backend uses response_format)
        const normalizedKey = key === 'output_format' ? 'response_format' : key;

        // Guard: skip primitive values — control definitions must be objects
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            console.warn(`Skipping malformed control "${key}" for model — expected object, got:`, typeof value);
            return;
        }

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
 * CRITICAL: Controls with default: null are NOT included (opt-in only)
 */
export function getModelDefaults(model: any) {
    if (!model?.controls) {
        return {};
    }

    const defaults: Record<string, any> = {};

    // Defensively parse controls if double-encoded as a JSON string
    let controls = model.controls;
    if (typeof controls === 'string') {
        try {
            controls = JSON.parse(controls);
        } catch {
            console.error('Failed to parse model controls JSON string in getModelDefaults for model:', model.name);
            return {};
        }
    }
    if (typeof controls !== 'object' || controls === null || Array.isArray(controls)) {
        return {};
    }

    // Keys that represent UI capabilities, not submission values
    const uiOnlyKeys = new Set(['tools']);

    Object.entries(controls).forEach(([key, value]: [string, any]) => {
        // Remap output_format -> response_format
        const normalizedKey = key === 'output_format' ? 'response_format' : key;

        // Guard: skip primitive values
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return;
        }

        // Skip UI-only capability flags
        if (uiOnlyKeys.has(normalizedKey)) {
            if (normalizedKey === 'tools' && value.allowed) {
                defaults[normalizedKey] = [];
            }
            return;
        }

        // Extract default value for actual submission parameters
        // SKIP if default is null - these are opt-in only controls
        let defaultValue: unknown = undefined;
        if (value.default !== undefined && value.default !== null) {
            defaultValue = value.default;
        } else if ('allowed' in value && !uiOnlyKeys.has(normalizedKey)) {
            defaultValue = value.allowed;
        } else if (value.enum && Array.isArray(value.enum) && value.enum.length > 0) {
            defaultValue = value.enum[0];
        }

        if (defaultValue === undefined) return;

        // For response_format: convert string -> dict, skip "text" (default behavior)
        if (normalizedKey === 'response_format' && typeof defaultValue === 'string') {
            if (defaultValue === 'text' || defaultValue === '') return;
            defaults[normalizedKey] = { type: defaultValue };
            return;
        }

        defaults[normalizedKey] = defaultValue;
    });

    return defaults;
}

