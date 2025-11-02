export type PromptMessageRole = "system" | "user" | "assistant";

export interface PromptModelConfig {
    output_format?: string;
    tool_choice?: string;
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    top_k?: number;
    store?: boolean;
    stream?: boolean;
    parallel_tool_calls?: boolean;
    tools?: string[]; // Array of selected tool names
    image_urls?: boolean;
    file_urls?: boolean;
    internal_web_search?: boolean;
    youtube_videos?: boolean;
    reasoning_effort?: string;
    verbosity?: string;
    reasoning_summary?: string;
}

export type PromptMessage = {
    role: string;
    content: string;
    metadata?: Record<string, unknown>;
};

export type VariableComponentType =
    | "textarea" // Default - multi-line text
    | "toggle" // On/Off with custom labels
    | "radio" // Single select from options
    | "checkbox" // Multi-select from options
    | "select" // Dropdown single select
    | "number"; // Number input with optional min/max/step

export interface VariableCustomComponent {
    type: VariableComponentType;
    options?: string[];
    allowOther?: boolean;
    toggleValues?: [string, string];
    min?: number;
    max?: number;
    step?: number;
}

export interface PromptVariable {
    name: string;
    defaultValue: string;
    customComponent?: VariableCustomComponent;
}

export type PromptsData = {
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    name?: string;
    description?: string;
    userId?: string;
    tools?: Record<string, unknown>;
    messages?: PromptMessage[];
    variableDefaults?: PromptVariable[]; // Array of { name, defaultValue, customComponent? }
    settings?: PromptModelConfig;
};

export interface PromptsBatchData {
    prompts: PromptsData[];
    overwriteExisting?: boolean; // If true, prompts with matching IDs will be updated
  }
  

export type SimplePromptsData = {
    id?: string;
    name?: string;
    tools?: string[];
    messages?: PromptMessage[];
    variableDefaults?: PromptVariable[];
};
