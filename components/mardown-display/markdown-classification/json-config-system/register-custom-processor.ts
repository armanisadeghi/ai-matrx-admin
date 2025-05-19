"use client";

import { configRegistry, CustomProcessorFn, ConfigEntry } from "./known-configs-from-json";
import { transformAstToContent } from "./custom-extractor-1";

/**
 * Registers a custom processor directly into the configRegistry
 */
export function registerCustomProcessor(
  id: string,
  name: string,
  type: string,
  customProcessor: CustomProcessorFn,
  description?: string
): void {
  // Check if this ID already exists
  if (configRegistry[id]) {
    console.warn(`Overwriting existing config with ID: ${id}`);
  }
  
  // Register the custom processor
  configRegistry[id] = {
    id,
    name,
    type,
    customProcessor,
    description
  };
  
  console.log(`[ConfigRegistry] Registered custom processor: ${id} (type: ${type})`);
}

/**
 * Helper to adapt content structure data to match what candidate profile view expects
 */
function adaptContentStructureToCandidateProfile(data: any): any {
  return {
    name: data.intro?.title || "Untitled Content",
    intro: data.intro?.text || "",
    key_experiences: data.items.map((item: any) => ({
      company: item.title || `Item ${item.id}`,
      details: [item.text]
    })),
    additional_accomplishments: data.outro?.text ? [data.outro.text] : [],
    location: [],
    compensation: [],
    availability: []
  };
}

/**
 * Initialize and register our custom processors
 * This should be called early in the application lifecycle
 */
export function initializeCustomProcessors(): void {
  // Register structured content processor
  registerCustomProcessor(
    "structured-content",
    "Structured Content",
    "content_structure", 
    (ast) => {
      // Process the AST with our custom transformer
      const result = transformAstToContent(ast);
      
      // Adapt the result to match what candidate profile views expect
      const adaptedResult = adaptContentStructureToCandidateProfile(result);
      
      return {
        extracted: adaptedResult,
        miscellaneous: []
      };
    },
    "Extracts intro, ordered list items, and outro from markdown content"
  );
  
  // Add more custom processors here as needed
  
  console.log(`[ConfigRegistry] Initialized custom processors`);
} 