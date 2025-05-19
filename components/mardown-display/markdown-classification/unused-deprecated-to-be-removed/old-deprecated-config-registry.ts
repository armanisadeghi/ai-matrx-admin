// import { MarkdownConfig } from "../processors/json-config-system/config-processor";
// import { 
//   jsonConfigSystemRegistry,
//   candidateProfileConfig,
//   candidateProfileStructuredConfig,
//   candidateProfileTextConfig,
//   appSuggestionsConfig,
//   googleSeoConfig
// } from "../processors/json-config-system/configs";

// export interface ConfigEntry {
//   id: string;        // Unique identifier for the config
//   name: string;      // Display name
//   type: string;      // Type identifier (e.g., "candidate_profile")
//   config: MarkdownConfig; // The actual configuration
//   description?: string; // Optional description
// }

// // Get all available config entries
// export function getAllConfigs(): ConfigEntry[] {
//   return Object.values(jsonConfigSystemRegistry);
// }

// // Get config by ID
// export function getConfigById(configId: string): ConfigEntry | null {
//   return jsonConfigSystemRegistry[configId] || null;
// }

// // Get configs by type
// export function getConfigsByType(configType: string): ConfigEntry[] {
//   return Object.values(jsonConfigSystemRegistry).filter(entry => entry.type === configType);
// }

// // Get config types
// export function getAllConfigTypes(): string[] {
//   return [...new Set(Object.values(jsonConfigSystemRegistry).map(entry => entry.type))];
// }

// export { jsonConfigSystemRegistry as configRegistry };
