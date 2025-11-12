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
    // Strategy 1: Find ```json ... ``` code blocks
    // We need to handle cases where the JSON content itself contains ``` markers
    const jsonBlockPattern = /```json\s*\n/g;
    const jsonStarts: number[] = [];
    let match;
    
    // Find all ```json markers
    while ((match = jsonBlockPattern.exec(text)) !== null) {
      jsonStarts.push(match.index + match[0].length);
    }
    
    if (jsonStarts.length === 0) {
      return {
        success: false,
        error: 'No JSON code block found in response',
        rawText: text,
      };
    }
    
    // Try each json block, starting from the last one (most likely to be complete)
    for (let i = jsonStarts.length - 1; i >= 0; i--) {
      const startPos = jsonStarts[i];
      
      // Find the matching closing ``` by looking for a valid JSON object
      // Start from the opening brace and track brace depth
      let jsonString = '';
      let braceDepth = 0;
      let inString = false;
      let escapeNext = false;
      let foundStart = false;
      
      for (let j = startPos; j < text.length; j++) {
        const char = text[j];
        
        // Check if we've hit the closing ``` before finding complete JSON
        if (!inString && text.substring(j, j + 3) === '```') {
          // We've reached a closing marker
          if (foundStart && braceDepth === 0 && jsonString.trim()) {
            // We have complete JSON, try to parse it
            try {
              const parsed = JSON.parse(jsonString.trim());
              if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                // Success! Remove ID if present
                if (parsed.id) {
                  delete parsed.id;
                }
                return {
                  success: true,
                  data: parsed,
                  rawText: text,
                };
              }
            } catch {
              // This JSON didn't parse, continue to next block
              break;
            }
          }
          break;
        }
        
        jsonString += char;
        
        // Handle escape sequences in strings
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        
        // Track string state
        if (char === '"') {
          inString = !inString;
          continue;
        }
        
        // Track brace depth (only outside strings)
        if (!inString) {
          if (char === '{') {
            braceDepth++;
            foundStart = true;
          } else if (char === '}') {
            braceDepth--;
            
            // If we've closed all braces, we might have complete JSON
            if (foundStart && braceDepth === 0) {
              try {
                const parsed = JSON.parse(jsonString.trim());
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                  // Success! Remove ID if present
                  if (parsed.id) {
                    delete parsed.id;
                  }
                  return {
                    success: true,
                    data: parsed,
                    rawText: text,
                  };
                }
              } catch {
                // Not valid JSON yet, keep going
              }
            }
          }
        }
      }
    }
    
    // If we get here, we couldn't extract valid JSON
    return {
      success: false,
      error: 'Could not extract valid JSON from code blocks',
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

