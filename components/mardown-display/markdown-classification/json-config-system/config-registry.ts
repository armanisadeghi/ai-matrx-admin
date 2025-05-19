import { MarkdownConfig } from "./config-processor";
import { configRegistry } from "./known-configs-from-json";

// Define types for our custom processor function
export type CustomProcessorFn = (ast: any) => { extracted: any; miscellaneous?: any };

export interface ConfigEntry {
  id: string;        // Unique identifier for the config
  name: string;      // Display name
  type: string;      // Type identifier (e.g., "candidate_profile")
  config: MarkdownConfig; // The actual configuration
  description?: string; // Optional description
  customProcessor?: CustomProcessorFn; // Optional custom processor function
}

// Define registry type for imports
export type ConfigRegistry = Record<string, ConfigEntry>;

// We export the initial configRegistry, but functions will use the registry from config-initializer
// which will be initialized with both standard and custom processors
export { configRegistry };

// Get all available config entries
export function getAllConfigs(): ConfigEntry[] {
  // Import dynamically to avoid circular dependencies
  const { registry } = require('./config-initializer') as { registry: ConfigRegistry };
  return Object.values(registry);
}

// Get config by ID
export function getConfigById(configId: string): ConfigEntry | null {
  // Import dynamically to avoid circular dependencies
  const { registry } = require('./config-initializer') as { registry: ConfigRegistry };
  return registry[configId] || null;
}

// Get configs by type
export function getConfigsByType(configType: string): ConfigEntry[] {
  // Import dynamically to avoid circular dependencies
  const { registry } = require('./config-initializer') as { registry: ConfigRegistry };
  return Object.values(registry).filter(entry => entry.type === configType);
}

// Get config types
export function getAllConfigTypes(): string[] {
  // Import dynamically to avoid circular dependencies
  const { registry } = require('./config-initializer') as { registry: ConfigRegistry };
  return [...new Set(Object.values(registry).map(entry => entry.type))];
}

// Register a custom processor
export function registerCustomProcessor(
  id: string,
  name: string,
  type: string,
  customProcessor: CustomProcessorFn,
  description?: string
): void {
  // Since our custom processors don't need a standard config,
  // we'll provide an empty one to satisfy the interface
  const emptyConfig: MarkdownConfig = {
    type: "custom",
    sections: [],
    fallback: {
      appendTo: "miscellaneous"
    }
  };
  
  configRegistry[id] = {
    id,
    name,
    type,
    config: emptyConfig,
    customProcessor,
    description
  };
}

// Update an existing config to use a custom processor
export function updateConfigWithCustomProcessor(
  configId: string,
  customProcessor: CustomProcessorFn
): void {
  if (configRegistry[configId]) {
    configRegistry[configId] = {
      ...configRegistry[configId],
      customProcessor
    };
  } else {
    throw new Error(`Config with ID '${configId}' not found`);
  }
}
