export type AiModelRow = {
    id: string;
    name: string;
    common_name: string | null;
    model_class: string;
    provider: string | null;
    endpoints: unknown | null;
    context_window: number | null;
    max_tokens: number | null;
    capabilities: unknown | null;
    controls: ControlsSchema | null;
    model_provider: string | null;
    is_deprecated: boolean | null;
    is_primary: boolean | null;
    is_premium: boolean | null;
    api_class: string | null;
};

export type AiProvider = {
    id: string;
    name: string | null;
    company_description: string | null;
    documentation_link: string | null;
    models_link: string | null;
};

export type AiModelFormData = {
    name: string;
    common_name: string;
    model_class: string;
    provider: string;
    api_class: string;
    context_window: string;
    max_tokens: string;
    model_provider: string;
    is_deprecated: boolean;
    is_primary: boolean;
    is_premium: boolean;
};

export type ControlParamType = 'boolean' | 'number' | 'integer' | 'string' | 'array' | 'object';

export type ControlParam = {
    type?: ControlParamType;
    min?: number;
    max?: number;
    default?: unknown;
    allowed?: boolean;
    enum?: string[];
    items?: { type: string };
    maxItems?: number;
    required?: boolean;
};

export type ControlsSchema = Record<string, ControlParam>;

export type ModelUsageItem = {
    id: string;
    name: string;
    table: 'prompts' | 'prompt_builtins';
    source_prompt_id?: string | null;
};

export type ModelUsageResult = {
    prompts: ModelUsageItem[];
    promptBuiltins: ModelUsageItem[];
};
