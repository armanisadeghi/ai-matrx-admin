/**
 * Comprehensive settings schema for prompts
 * This document describes all possible settings and their possible values
 * that the UI can generate for prompts. This is used to prepare the Python backend.
 */

/**
 * Complete settings object with all possible options at maximum configuration
 * This represents the most comprehensive settings object that can be generated
 */
export const COMPREHENSIVE_PROMPT_SETTINGS = {
    // Required: Model identifier (UUID)
    model_id: "548126f2-714a-4562-9001-0c31cbeea375", // Example UUID
    
    // Response format — backend expects { type: "json_object" } dict or omitted for "text" (default)
    // response_format: { type: "json_object" }, // Only set when non-default
    
    // Tool configuration
    tool_choice: "auto", // Possible values: "auto" | "required" | "none"
    tools: [], // Array of tool names (strings)
    
    // Sampling parameters
    temperature: 1, // Number between 0 and 2 (typically)
    max_tokens: 4096, // Number between 1 and model max (typically 16000 for GPT-4, 32000 for others)
    top_p: 1, // Number between 0 and 1
    top_k: 50, // Number between 1 and 100
    
    // Boolean flags
    store: true, // Boolean: Store conversation in database
    stream: true, // Boolean: Stream response in real-time
    parallel_tool_calls: false, // Boolean: Enable parallel tool execution
    
    // Attachment capabilities (feature flags)
    image_urls: false, // Boolean: Enable image URL attachments
    file_urls: false, // Boolean: Enable file URL attachments
    internal_web_search: false, // Boolean: Enable web search capability
    youtube_videos: false, // Boolean: Enable YouTube video processing
    
    // Reasoning model parameters (for models like o1-series)
    reasoning_effort: "medium", // Possible values: "none" | "low" | "medium" | "high"
    verbosity: "medium", // Possible values: "low" | "medium" | "high"
    reasoning_summary: "auto", // Possible values: "auto" | "enabled" | "disabled"
    
    // Stop sequences (if supported)
    stop_sequences: [], // Array of strings
};

/**
 * Schema definitions for each setting type
 * This describes the type, possible values, and constraints for each setting
 */
export const SETTINGS_SCHEMA = {
    model_id: {
        type: "string",
        format: "uuid",
        description: "The unique identifier for the AI model to use",
        required: true,
        example: "548126f2-714a-4562-9001-0c31cbeea375",
    },
    
    response_format: {
        type: "object",
        description: "Controls the response format. Omit for text (default). Send { type: 'json_object' } for JSON mode.",
        default: null,
        required: false,
        example: { type: "json_object" },
    },
    
    tool_choice: {
        type: "string",
        enum: ["auto", "required", "none"],
        description: "Controls how tools are used. 'auto' lets model decide, 'required' forces tool use, 'none' disables",
        default: "auto",
        required: false,
    },
    
    tools: {
        type: "array",
        items: "string",
        description: "Array of tool identifiers to make available to the model",
        default: [],
        required: false,
    },
    
    temperature: {
        type: "number",
        min: 0,
        max: 2,
        description: "Controls randomness in responses. Lower values are more deterministic, higher values more creative",
        default: 1,
        required: false,
    },
    
    max_tokens: {
        type: "number",
        min: 1,
        max: "model-dependent", // Typically 4096-32000 depending on model
        description: "Maximum number of tokens to generate in the response",
        default: 4096,
        required: false,
    },
    
    top_p: {
        type: "number",
        min: 0,
        max: 1,
        description: "Nucleus sampling parameter. Controls diversity by considering tokens with cumulative probability mass p",
        default: 1,
        required: false,
    },
    
    top_k: {
        type: "number",
        min: 1,
        max: 100,
        description: "Sampling parameter. Limits the number of top tokens to consider",
        default: 50,
        required: false,
    },
    
    store: {
        type: "boolean",
        description: "Whether to store the conversation in the database for history",
        default: true,
        required: false,
    },
    
    stream: {
        type: "boolean",
        description: "Whether to stream the response in real-time chunks",
        default: true,
        required: false,
    },
    
    parallel_tool_calls: {
        type: "boolean",
        description: "Whether to allow the model to call multiple tools simultaneously",
        default: false,
        required: false,
    },
    
    image_urls: {
        type: "boolean",
        description: "Enable the model to process and analyze images via URLs",
        default: false,
        required: false,
    },
    
    file_urls: {
        type: "boolean",
        description: "Enable the model to process and analyze files via URLs",
        default: false,
        required: false,
    },
    
    internal_web_search: {
        type: "boolean",
        description: "Enable web search capability for real-time information",
        default: false,
        required: false,
    },
    
    youtube_videos: {
        type: "boolean",
        description: "Enable processing and analysis of YouTube videos",
        default: false,
        required: false,
    },
    
    reasoning_effort: {
        type: "string",
        enum: ["none", "low", "medium", "high"],
        description: "For reasoning models (o1, etc.). Controls computational effort for reasoning",
        default: "medium",
        required: false,
    },
    
    verbosity: {
        type: "string",
        enum: ["low", "medium", "high"],
        description: "For reasoning models. Controls detail level of reasoning output",
        default: "medium",
        required: false,
    },
    
    reasoning_summary: {
        type: "string",
        enum: ["auto", "enabled", "disabled"],
        description: "For reasoning models. Controls whether reasoning steps are summarized",
        default: "auto",
        required: false,
    },
    
    stop_sequences: {
        type: "array",
        items: "string",
        description: "Array of sequences that will stop token generation when encountered",
        default: [],
        required: false,
    },
};

/**
 * Minimal settings object (most basic configuration)
 */
export const MINIMAL_PROMPT_SETTINGS = {
    model_id: "548126f2-714a-4562-9001-0c31cbeea375",
    stream: true,
};

/**
 * Common settings presets
 */
export const SETTINGS_PRESETS = {
    default: {
        model_id: "548126f2-714a-4562-9001-0c31cbeea375",
        stream: true,
        store: true,
        temperature: 1,
        max_tokens: 4096,
    },
    
    json_mode: {
        model_id: "548126f2-714a-4562-9001-0c31cbeea375",
        stream: true,
        store: true,
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 4096,
    },
    
    with_tools: {
        model_id: "548126f2-714a-4562-9001-0c31cbeea375",
        stream: true,
        store: true,
        tools: ["tool1", "tool2"],
        tool_choice: "auto",
        parallel_tool_calls: true,
        temperature: 0.7,
        max_tokens: 4096,
    },
    
    reasoning_model: {
        model_id: "548126f2-714a-4562-9001-0c31cbeea375",
        stream: true,
        store: true,
        reasoning_effort: "high",
        verbosity: "medium",
        reasoning_summary: "enabled",
    },
    
    multimodal: {
        model_id: "548126f2-714a-4562-9001-0c31cbeea375",
        stream: true,
        store: true,
        image_urls: true,
        file_urls: true,
        youtube_videos: true,
        internal_web_search: true,
        temperature: 1,
        max_tokens: 8192,
    },
};

/**
 * TypeScript type definitions for settings
 */
export type PromptSettings = {
    // Required
    model_id: string;
    
    // Optional string enums
    response_format?: { type: "text" | "json_object" | "json_schema"; [key: string]: unknown };
    tool_choice?: "auto" | "required" | "none";
    reasoning_effort?: "none" | "low" | "medium" | "high";
    verbosity?: "low" | "medium" | "high";
    reasoning_summary?: "auto" | "enabled" | "disabled";
    
    // Optional arrays
    tools?: string[];
    stop_sequences?: string[];
    
    // Optional numbers
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    top_k?: number;
    
    // Optional booleans
    store?: boolean;
    stream?: boolean;
    parallel_tool_calls?: boolean;
    image_urls?: boolean;
    file_urls?: boolean;
    internal_web_search?: boolean;
    youtube_videos?: boolean;
};

/**
 * Export comprehensive object that Python can use
 * This represents the MAXIMUM possible configuration
 */
export const PYTHON_BACKEND_MAXIMUM_CONFIGURATION = {
    description: "Maximum possible settings object that can be generated by the UI",
    settings: COMPREHENSIVE_PROMPT_SETTINGS,
    schema: SETTINGS_SCHEMA,
    presets: SETTINGS_PRESETS,
    settings_type: "PromptSettings",
};

