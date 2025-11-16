/**
 * Progressive JSON Parser
 * 
 * Safely parses JSON as it streams in, extracting complete sections
 * without throwing errors on incomplete data
 */

export interface PartialPromptData {
  name?: string;
  description?: string;
  messages?: Array<{
    role: string;
    content: string;
  }>;
  variableDefaults?: Array<{
    name: string;
    defaultValue?: string;
    customComponent?: any;
  }>;
  settings?: {
    model_id?: string;
    store?: boolean;
    tools?: any[];
    top_p?: number;
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
    [key: string]: any;
  };
  isComplete: boolean;
}

/**
 * Attempts to parse partial JSON by treating it as a string and extracting key-value pairs
 * This is more robust than regex matching and handles incomplete JSON gracefully
 */
export function parsePartialJson(text: string): PartialPromptData {
  const result: PartialPromptData = {
    isComplete: false,
  };

  if (!text || !text.trim()) {
    return result;
  }

  // Find the JSON code block
  const jsonMatch = text.match(/```json\s*\n([\s\S]*?)(?:```|$)/);
  if (!jsonMatch) {
    return result;
  }

  let jsonText = jsonMatch[1].trim();
  
  // Try to parse as-is first (might be complete)
  try {
    const parsed = JSON.parse(jsonText);
    return {
      ...parsed,
      isComplete: true,
    };
  } catch {
    // Not complete yet, proceed with partial parsing
  }

  // Extract what we can from incomplete JSON using a more forgiving approach
  
  // Extract name - find the value between "name": " and the next unescaped "
  result.name = extractStringValue(jsonText, 'name');
  
  // Extract description
  result.description = extractStringValue(jsonText, 'description');

  // Extract messages array
  result.messages = extractMessagesArray(jsonText);

  // Extract variableDefaults array
  result.variableDefaults = extractVariablesArray(jsonText);

  // Extract settings object
  result.settings = extractSettingsObject(jsonText);

  return result;
}

/**
 * Extract a simple string value from JSON text
 */
function extractStringValue(jsonText: string, key: string): string | undefined {
  // Look for "key": "value" pattern, being careful with escaped quotes
  const pattern = new RegExp(`"${key}"\\s*:\\s*"`, 'i');
  const startMatch = pattern.exec(jsonText);
  
  if (!startMatch) return undefined;
  
  let startIndex = startMatch.index + startMatch[0].length;
  let value = '';
  let escaped = false;
  
  // Read until we find an unescaped quote
  for (let i = startIndex; i < jsonText.length; i++) {
    const char = jsonText[i];
    
    if (escaped) {
      // Handle escaped characters
      if (char === 'n') value += '\n';
      else if (char === 't') value += '\t';
      else if (char === 'r') value += '\r';
      else if (char === '"') value += '"';
      else if (char === '\\') value += '\\';
      else value += char;
      escaped = false;
    } else if (char === '\\') {
      escaped = true;
    } else if (char === '"') {
      // Found the closing quote
      return value;
    } else {
      value += char;
    }
  }
  
  // String was incomplete, but return what we have
  return value || undefined;
}

/**
 * Extract messages array from JSON text
 */
function extractMessagesArray(jsonText: string): Array<{ role: string; content: string }> | undefined {
  const messagesMatch = jsonText.match(/"messages"\s*:\s*\[/i);
  if (!messagesMatch) return undefined;
  
  const messages: Array<{ role: string; content: string }> = [];
  let searchStart = messagesMatch.index! + messagesMatch[0].length;
  
  // Find each message object
  while (true) {
    // Look for next message object starting with "role"
    const roleMatch = jsonText.substring(searchStart).match(/\{\s*"role"\s*:\s*"/);
    if (!roleMatch) break;
    
    const roleStart = searchStart + roleMatch.index! + roleMatch[0].length;
    
    // Extract role value
    let role = '';
    let i = roleStart;
    for (; i < jsonText.length && jsonText[i] !== '"'; i++) {
      role += jsonText[i];
    }
    
    if (!role) break;
    
    // Look for content field
    const contentMatch = jsonText.substring(i).match(/,\s*"content"\s*:\s*"/);
    if (!contentMatch) break;
    
    const contentStart = i + contentMatch.index! + contentMatch[0].length;
    
    // Extract content value (handling escapes)
    let content = '';
    let escaped = false;
    let foundEnd = false;
    
    for (let j = contentStart; j < jsonText.length; j++) {
      const char = jsonText[j];
      
      if (escaped) {
        if (char === 'n') content += '\n';
        else if (char === 't') content += '\t';
        else if (char === 'r') content += '\r';
        else if (char === '"') content += '"';
        else if (char === '\\') content += '\\';
        else content += char;
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        // Found end of content string
        foundEnd = true;
        searchStart = j + 1;
        break;
      } else {
        content += char;
      }
    }
    
    // Add the message (even if incomplete)
    if (role && content) {
      messages.push({ role, content });
    }
    
    if (!foundEnd) break; // Incomplete message, stop here
  }
  
  return messages.length > 0 ? messages : undefined;
}

/**
 * Extract variableDefaults array from JSON text
 */
function extractVariablesArray(jsonText: string): Array<any> | undefined {
  const variablesMatch = jsonText.match(/"variableDefaults"\s*:\s*\[/i);
  if (!variablesMatch) return undefined;
  
  const startIndex = variablesMatch.index! + variablesMatch[0].length;
  const remaining = jsonText.substring(startIndex);
  
  // Try to find the closing bracket for the array
  let bracketDepth = 1;
  let braceDepth = 0;
  let inString = false;
  let escaped = false;
  let endIndex = -1;
  
  for (let i = 0; i < remaining.length; i++) {
    const char = remaining[i];
    
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      continue;
    }
    
    if (char === '"' && !escaped) {
      inString = !inString;
      continue;
    }
    
    if (inString) continue;
    
    if (char === '{') braceDepth++;
    else if (char === '}') braceDepth--;
    else if (char === '[') bracketDepth++;
    else if (char === ']') {
      bracketDepth--;
      if (bracketDepth === 0) {
        endIndex = i;
        break;
      }
    }
  }
  
  // Extract the array content
  const arrayContent = endIndex > 0 ? remaining.substring(0, endIndex) : remaining;
  
  // Try to parse as complete JSON
  try {
    return JSON.parse('[' + arrayContent + ']');
  } catch {
    // Fall back to extracting individual variable objects
    const variables: Array<any> = [];
    const varMatches = arrayContent.matchAll(/\{\s*"name"\s*:\s*"([^"]+)"/g);
    
    for (const match of varMatches) {
      const varStart = match.index!;
      
      // Find the closing brace for this variable
      let braceCount = 0;
      let varEnd = -1;
      let inStr = false;
      let esc = false;
      
      for (let i = varStart; i < arrayContent.length; i++) {
        const char = arrayContent[i];
        
        if (esc) {
          esc = false;
          continue;
        }
        if (char === '\\') {
          esc = true;
          continue;
        }
        if (char === '"') {
          inStr = !inStr;
          continue;
        }
        if (inStr) continue;
        
        if (char === '{') braceCount++;
        else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            varEnd = i + 1;
            break;
          }
        }
      }
      
      if (varEnd > varStart) {
        try {
          const varJson = arrayContent.substring(varStart, varEnd);
          variables.push(JSON.parse(varJson));
        } catch {
          // Couldn't parse, add minimal info
          variables.push({ name: match[1] });
        }
      }
    }
    
    return variables.length > 0 ? variables : undefined;
  }
}

/**
 * Extract settings object from JSON text
 */
function extractSettingsObject(jsonText: string): Record<string, any> | undefined {
  const settingsMatch = jsonText.match(/"settings"\s*:\s*\{/i);
  if (!settingsMatch) return undefined;
  
  const startIndex = settingsMatch.index! + settingsMatch[0].length;
  const remaining = jsonText.substring(startIndex);
  
  // Find the closing brace
  let braceDepth = 1;
  let inString = false;
  let escaped = false;
  let endIndex = -1;
  
  for (let i = 0; i < remaining.length; i++) {
    const char = remaining[i];
    
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\') {
      escaped = true;
      continue;
    }
    
    if (char === '"') {
      inString = !inString;
      continue;
    }
    
    if (inString) continue;
    
    if (char === '{') braceDepth++;
    else if (char === '}') {
      braceDepth--;
      if (braceDepth === 0) {
        endIndex = i;
        break;
      }
    }
  }
  
  const settingsContent = endIndex > 0 ? remaining.substring(0, endIndex) : remaining;
  
  // Try to parse as complete JSON
  try {
    return JSON.parse('{' + settingsContent + '}');
  } catch {
    // Fall back to extracting individual fields
    const settings: any = {};
    
    // Extract string fields
    const modelId = extractStringValue('{' + settingsContent, 'model_id');
    if (modelId) settings.model_id = modelId;
    
    // Extract boolean fields
    const storeBool = settingsContent.match(/"store"\s*:\s*(true|false)/i);
    if (storeBool) settings.store = storeBool[1].toLowerCase() === 'true';
    
    const streamBool = settingsContent.match(/"stream"\s*:\s*(true|false)/i);
    if (streamBool) settings.stream = streamBool[1].toLowerCase() === 'true';
    
    // Extract numeric fields
    const tempNum = settingsContent.match(/"temperature"\s*:\s*([0-9.]+)/i);
    if (tempNum) settings.temperature = parseFloat(tempNum[1]);
    
    const topPNum = settingsContent.match(/"top_p"\s*:\s*([0-9.]+)/i);
    if (topPNum) settings.top_p = parseFloat(topPNum[1]);
    
    const maxTokensNum = settingsContent.match(/"max_tokens"\s*:\s*([0-9]+)/i);
    if (maxTokensNum) settings.max_tokens = parseInt(maxTokensNum[1], 10);
    
    // Extract tools array
    const toolsMatch = settingsContent.match(/"tools"\s*:\s*\[(.*?)\]/i);
    if (toolsMatch) {
      try {
        settings.tools = JSON.parse('[' + toolsMatch[1] + ']');
      } catch {
        settings.tools = [];
      }
    }
    
    return Object.keys(settings).length > 0 ? settings : undefined;
  }
}

/**
 * Extract just the JSON block from markdown text
 */
export function extractJsonBlock(text: string): string | null {
  const jsonMatch = text.match(/```json\s*\n([\s\S]*?)(?:```|$)/);
  return jsonMatch ? jsonMatch[1].trim() : null;
}

/**
 * Extract the non-JSON content (before and after the JSON block)
 * Handles both complete and incomplete JSON blocks during streaming
 */
export function extractNonJsonContent(text: string): { before: string; after: string } {
  // First try to match a complete JSON block (with closing backticks)
  const completeMatch = text.match(/([\s\S]*?)```json[\s\S]*?```([\s\S]*)/);
  
  if (completeMatch) {
    return {
      before: completeMatch[1].trim(),
      after: completeMatch[2].trim(),
    };
  }
  
  // If no complete block, check for an incomplete JSON block (without closing backticks)
  const incompleteMatch = text.match(/([\s\S]*?)```json/);
  
  if (incompleteMatch) {
    // Found the start of a JSON block, return everything before it
    // Don't return anything after since the block isn't complete
    return {
      before: incompleteMatch[1].trim(),
      after: '',
    };
  }
  
  // No JSON block found at all, return all as before
  return {
    before: text.trim(),
    after: '',
  };
}

