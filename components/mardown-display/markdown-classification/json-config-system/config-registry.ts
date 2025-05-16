import { MarkdownConfig } from "./config-processor";
import { configRegistry } from "./known-configs-from-json";

export interface ConfigEntry {
  id: string;        // Unique identifier for the config
  name: string;      // Display name
  type: string;      // Type identifier (e.g., "candidate_profile")
  config: MarkdownConfig; // The actual configuration
  description?: string; // Optional description
}



// Get all available config entries
export function getAllConfigs(): ConfigEntry[] {
  return Object.values(configRegistry);
}

// Get config by ID
export function getConfigById(configId: string): ConfigEntry | null {
  return configRegistry[configId] || null;
}

// Get configs by type
export function getConfigsByType(configType: string): ConfigEntry[] {
  return Object.values(configRegistry).filter(entry => entry.type === configType);
}

// Get config types
export function getAllConfigTypes(): string[] {
  return [...new Set(Object.values(configRegistry).map(entry => entry.type))];
}

export { configRegistry };
