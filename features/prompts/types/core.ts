export type PromptMessageRole = "system" | "user" | "assistant";

export interface PromptSettings {
    model_id?: string;
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

/**
 * File reference for message metadata
 */
export interface MessageFileReference {
    uri: string;
    mime_type?: string;
}

/**
 * Resource reference for message metadata (minimal info for backend)
 */
export interface MessageResourceReference {
    type: string;
    id?: string;
    data?: any; // Full object for tables
}

/**
 * Message metadata structure - extensible for future additions
 */
export interface MessageMetadata {
    taskId?: string;
    files?: MessageFileReference[];
    resources?: MessageResourceReference[];
    timestamp?: string;
    timeToFirstToken?: number;
    totalTime?: number;
    tokens?: number;
    cost?: number;
    [key: string]: unknown; // Allow additional metadata properties
}

export type PromptMessage = {
    role: string;
    content: string;
    metadata?: MessageMetadata;
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
    settings?: PromptSettings;
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
