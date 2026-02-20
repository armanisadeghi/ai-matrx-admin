export type PromptMessageRole = "system" | "user" | "assistant";

export type ResponseFormatType = 'text' | 'json_object' | 'json_schema';

/**
 * Proper response_format shape the backend expects: { type: "json_object" }.
 * "text" is the default — omit the field entirely instead of sending { type: "text" }.
 */
export interface ResponseFormatDict {
    type: ResponseFormatType;
    [key: string]: unknown;
}

export interface PromptSettings {
    model_id?: string;
    /** @deprecated Legacy field — may exist in DB records. Use response_format instead. */
    output_format?: string;
    tool_choice?: string;
    temperature?: number;
    max_output_tokens?: number;
    top_p?: number;
    top_k?: number;
    thinking_budget?: number;
    store?: boolean;
    stream?: boolean;
    parallel_tool_calls?: boolean;
    include_thoughts?: boolean;
    tools?: string[];
    image_urls?: boolean;
    file_urls?: boolean;
    internal_web_search?: boolean;
    internal_url_context?: boolean;
    youtube_videos?: boolean;
    reasoning_effort?: string;
    verbosity?: string;
    reasoning_summary?: string;
    
    // Image/Video model settings
    n?: number;
    seed?: number;
    steps?: number;
    width?: number;
    height?: number;
    guidance_scale?: number;
    negative_prompt?: string;
    response_format?: ResponseFormatDict | string;
    fps?: number;
    seconds?: string; // Video: duration
    output_quality?: number;
    image_loras?: any[]; // Object array for image LoRAs
    frame_images?: any[]; // Object array for video frame images
    reference_images?: string[]; // String array of image URLs
    disable_safety_checker?: boolean;
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
    required?: boolean;
    helpText?: string;
}

export interface PromptDb {
  id: string;
  created_at: string;
  updated_at: string | null;
  name: string | null;
  messages: unknown | null; // or define a specific type if you know the structure
  variable_defaults: PromptVariable[] | null; // or more specific type
  tools: unknown | null; // or define a specific type if you know the structure
  user_id: string | null;
  settings: PromptSettings | null; // or more specific type
  description: string | null;
}

export type PromptData = {
    id?: string;
    createdAt?: Date;
    updatedAt?: Date;
    name?: string;
    description?: string;
    userId?: string;
    tools?: string[];
    messages?: PromptMessage[];
    variableDefaults?: PromptVariable[]; // Array of { name, defaultValue, customComponent? }
    settings?: PromptSettings;
};

export interface PromptsBatchData {
    prompts: PromptData[];
    overwriteExisting?: boolean; // If true, prompts with matching IDs will be updated
}


export type SimplePromptsData = {
    id?: string;
    name?: string;
    tools?: string[];
    messages?: PromptMessage[];
    variableDefaults?: PromptVariable[];
};
