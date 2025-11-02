/**
 * Safely extract JSON from markdown code blocks in text responses
 * This function NEVER throws errors - it returns null if extraction fails
 */

export interface JsonExtractionResult {
  success: boolean;
  data?: any;
  error?: string;
  rawText: string;
}

export function extractJsonFromText(text: string): JsonExtractionResult {
  if (!text || typeof text !== 'string') {
    return {
      success: false,
      error: 'No text provided',
      rawText: text || '',
    };
  }

  try {
    // Find all ```json ... ``` code blocks
    const codeBlockRegex = /```json\s*([\s\S]*?)```/g;
    const matches = [];
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      matches.push(match);
    }
    
    if (matches.length === 0) {
      return {
        success: false,
        error: 'No JSON code block found in response',
        rawText: text,
      };
    }
    
    // Take the last match (most likely to be the final output)
    const lastMatch = matches[matches.length - 1];
    const jsonString = lastMatch[1].trim();
    
    // Basic validation
    if (!jsonString.startsWith('{') || !jsonString.endsWith('}')) {
      return {
        success: false,
        error: 'JSON block appears incomplete',
        rawText: text,
      };
    }
    
    // Try to parse
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (parseError) {
      return {
        success: false,
        error: `JSON parsing failed: ${parseError instanceof Error ? parseError.message : 'Invalid JSON'}`,
        rawText: text,
      };
    }
    
    // Validate it's an object
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        success: false,
        error: 'Extracted JSON is not a valid object',
        rawText: text,
      };
    }
    
    // Remove ID if present (we'll use the existing ID)
    if (parsed.id) {
      delete parsed.id;
    }
    
    return {
      success: true,
      data: parsed,
      rawText: text,
    };
  } catch (error) {
    // Catch-all for any unexpected errors
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during extraction',
      rawText: text,
    };
  }
}

