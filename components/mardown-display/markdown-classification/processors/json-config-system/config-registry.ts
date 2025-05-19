import {
    candidateProfileConfig,
    candidateProfileStructuredConfig,
    candidateProfileTextConfig,
    appSuggestionsConfig,
    googleSeoConfig,
} from "./configs";

interface JsonProcessorConfigDefinition {
    id: string;
    name: string;
    type: string;
    config: any;
    description: string;
}

// Individual definitions
const CANDIDATE_PROFILE_DEFINITION: JsonProcessorConfigDefinition = {
    id: "candidateProfile",
    name: "Candidate Profile",
    type: "candidate_profile",
    config: candidateProfileConfig,
    description: "Standard configuration for parsing candidate profiles",
};

const CANDIDATE_PROFILE_STRUCTURED_DEFINITION: JsonProcessorConfigDefinition = {
    id: "candidateProfileStructured",
    name: "Candidate Profile Structured",
    type: "candidate_profile_structured",
    config: candidateProfileStructuredConfig,
    description: "Configuration for parsing structured candidate profiles",
};

const CANDIDATE_PROFILE_TEXT_DEFINITION: JsonProcessorConfigDefinition = {
    id: "candidateProfileText",
    name: "Candidate Profile Text",
    type: "candidate_profile_text",
    config: candidateProfileTextConfig,
    description: "Configuration for parsing candidate profiles as text",
};

const APP_SUGGESTIONS_DEFINITION: JsonProcessorConfigDefinition = {
    id: "appSuggestions",
    name: "App Suggestions",
    type: "app_suggestions",
    config: appSuggestionsConfig,
    description: "Configuration for parsing app suggestions",
};

const GOOGLE_SEO_DEFINITION: JsonProcessorConfigDefinition = {
    id: "googleSeo",
    name: "Google SEO",
    type: "google_seo",
    config: googleSeoConfig,
    description: "Configuration for parsing Google SEO tips",
};

// Registry array
export const JSON_CONFIG_SYSTEM_REGISTRY = [
    CANDIDATE_PROFILE_DEFINITION,
    CANDIDATE_PROFILE_STRUCTURED_DEFINITION,
    CANDIDATE_PROFILE_TEXT_DEFINITION,
    APP_SUGGESTIONS_DEFINITION,
    GOOGLE_SEO_DEFINITION,
];

// Utility functions
export const getConfigSelectOptions = () => {
    return JSON_CONFIG_SYSTEM_REGISTRY.map((config) => ({
        value: config.id,
        label: config.name,
        description: config.description,
    }));
};

export const getConfigEntry = (configId: string) => {
    return JSON_CONFIG_SYSTEM_REGISTRY.find((c) => c.id === configId) || null;
};

export const hasConfig = (configId: string) => {
    return JSON_CONFIG_SYSTEM_REGISTRY.some((c) => c.id === configId);
};
