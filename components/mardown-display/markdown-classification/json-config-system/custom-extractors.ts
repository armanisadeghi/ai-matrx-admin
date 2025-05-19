"use client";

import { transformAstToContent } from "./custom-extractor-1";
import { registerCustomProcessor } from "./config-registry";

// Example of how to register a custom processor
export function registerCustomExtractors() {
  // Register our custom content processor
  registerCustomProcessor(
    "structured-content", // id
    "Structured Content", // name
    "content_structure", // type
    (ast) => {
      // Process AST using our custom transformer
      const result = transformAstToContent(ast);
      
      // Return in the expected format with extracted data
      return {
        extracted: result,
        miscellaneous: [] // Optional miscellaneous data
      };
    },
    "Extracts intro, ordered list items, and outro from markdown content"
  );
  
  // More custom extractors can be registered here
}

// Call this function during app initialization to register all custom extractors 