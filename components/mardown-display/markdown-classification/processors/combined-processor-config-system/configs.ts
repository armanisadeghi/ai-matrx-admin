import { BreakConfig } from "./break-config-processor";

const appSuggestionsConfig: BreakConfig[] = [
    {
        key: "Suggestion 1",
        breakOn: { type: "heading", content: "1. Suggestion", depth: 2 },
    },
    {
        key: "Suggestion 2",
        breakOn: { type: "heading", content: "2. Suggestion", depth: 2 },
    },
    {
        key: "Suggestion 3",
        breakOn: { type: "heading", content: "3. Suggestion", depth: 2 },
    },
];

const APP_SUGGESTIONS_BREAK_CONFIG_DEFINITION = {
    id: "appSuggestionsBreaks",
    name: "App Suggestions Breaks",
    type: "app_suggestions",
    processorType: "breakConfig",
    config: appSuggestionsConfig,
    description: "Configuration for parsing app suggestions",
};

export const BREAKING_CONFIGS = [APP_SUGGESTIONS_BREAK_CONFIG_DEFINITION];

// Utility functions
export const getConfigSelectOptions = () => {
    return BREAKING_CONFIGS.map((config) => ({
        value: config.id,
        label: config.name,
        description: config.description,
    }));
};

export const getConfigEntry = (configId: string) => {
    return BREAKING_CONFIGS.find((c) => c.id === configId) || null;
};

export const hasConfig = (configId: string) => {
    return BREAKING_CONFIGS.some((c) => c.id === configId);
};

export const getConfigObject = (configId: string) => {
    const configEntry = getConfigEntry(configId);
    if (!configEntry) return {};
    return configEntry.config;
};
