/**
 * Hook to manage available models, configurations, and tools for the Prompt Builder
 * This will eventually be updated to handle dynamic model data and user preferences
 */

export interface ModelConfig {
    textFormat: string;
    toolChoice: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    storeLogs: boolean;
    reasoningEffort?: string;
    verbosity?: string;
    summary?: string;
}

export function useAvailableModels() {
    // Default model
    const defaultModel = "548126f2-714a-4562-9001-0c31cbeea375";

    // Default model configuration
    const defaultModelConfig: ModelConfig = {
        textFormat: "text",
        toolChoice: "auto",
        temperature: 1.0,
        maxTokens: 16000,
        topP: 1.0,
        storeLogs: true,
        reasoningEffort: "medium",
        verbosity: "medium",
        summary: "auto",
    };

    // Available tools (hard-coded for now)
    const availableTools = [
        "web_search",
        "web_page_read",
        "get_news",
        "get_weather",
        "run_python_code",
        "make_html_page"
    ];

    return {
        defaultModel,
        defaultModelConfig,
        availableTools,
    };
}

