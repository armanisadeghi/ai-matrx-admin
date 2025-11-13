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
 * Attempts to parse partial JSON by trying different completion strategies
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

  // Extract what we can from incomplete JSON
  // We'll use regex to extract completed fields

  // Extract name (simple string field)
  const nameMatch = jsonText.match(/"name"\s*:\s*"([^"\\]*(\\.[^"\\]*)*)"/);
  if (nameMatch) {
    result.name = nameMatch[1];
  }

  // Extract description (simple string field)
  const descMatch = jsonText.match(/"description"\s*:\s*"([^"\\]*(\\.[^"\\]*)*)"/);
  if (descMatch) {
    result.description = descMatch[1];
  }

  // Extract messages array
  try {
    const messagesMatch = jsonText.match(/"messages"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
    if (messagesMatch) {
      const messagesContent = messagesMatch[1];
      const messages: Array<{ role: string; content: string }> = [];
      
      // Find individual message objects
      const messageRegex = /\{\s*"role"\s*:\s*"([^"]+)"\s*,\s*"content"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
      let match;
      
      while ((match = messageRegex.exec(messagesContent)) !== null) {
        const role = match[1];
        let content = match[2];
        
        // Check if this message is complete (has closing brace)
        const afterMatch = messagesContent.substring(match.index + match[0].length);
        const hasClosing = afterMatch.match(/^\s*"\s*\}/);
        
        if (hasClosing) {
          // Complete message - unescape the content
          content = content.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
          messages.push({ role, content });
        } else {
          // Incomplete message - still include it but mark as partial
          content = content.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
          messages.push({ role, content: content + '...' });
        }
      }
      
      if (messages.length > 0) {
        result.messages = messages;
      }
    }
  } catch (error) {
    // Failed to extract messages, continue with other fields
  }

  // Extract variableDefaults array
  try {
    const variablesMatch = jsonText.match(/"variableDefaults"\s*:\s*\[([\s\S]*?)(?:\]|$)/);
    if (variablesMatch) {
      const variablesContent = variablesMatch[1];
      
      // Try to parse as complete JSON array
      try {
        const variables = JSON.parse('[' + variablesContent + ']');
        result.variableDefaults = variables;
      } catch {
        // Try to extract individual variable objects
        const variables: Array<any> = [];
        const varRegex = /\{\s*"name"\s*:\s*"([^"]+)"/g;
        let match;
        
        while ((match = varRegex.exec(variablesContent)) !== null) {
          const varName = match[1];
          const varStart = match.index;
          
          // Try to find the complete variable object
          let braceDepth = 0;
          let varEnd = varStart;
          let foundStart = false;
          
          for (let i = varStart; i < variablesContent.length; i++) {
            const char = variablesContent[i];
            if (char === '{') {
              braceDepth++;
              foundStart = true;
            } else if (char === '}') {
              braceDepth--;
              if (foundStart && braceDepth === 0) {
                varEnd = i + 1;
                break;
              }
            }
          }
          
          if (varEnd > varStart) {
            try {
              const varJson = variablesContent.substring(varStart, varEnd);
              const varObj = JSON.parse(varJson);
              variables.push(varObj);
            } catch {
              // Couldn't parse, add minimal info
              variables.push({ name: varName });
            }
          }
        }
        
        if (variables.length > 0) {
          result.variableDefaults = variables;
        }
      }
    }
  } catch (error) {
    // Failed to extract variables
  }

  // Extract settings object
  try {
    const settingsMatch = jsonText.match(/"settings"\s*:\s*\{([\s\S]*?)(?:\}|$)/);
    if (settingsMatch) {
      const settingsContent = settingsMatch[1];
      
      // Try to parse as complete JSON object
      try {
        const settings = JSON.parse('{' + settingsContent + '}');
        result.settings = settings;
      } catch {
        // Extract individual settings fields
        const settings: any = {};
        
        // Extract simple fields
        const modelMatch = settingsContent.match(/"model_id"\s*:\s*"([^"]+)"/);
        if (modelMatch) settings.model_id = modelMatch[1];
        
        const storeMatch = settingsContent.match(/"store"\s*:\s*(true|false)/);
        if (storeMatch) settings.store = storeMatch[1] === 'true';
        
        const streamMatch = settingsContent.match(/"stream"\s*:\s*(true|false)/);
        if (streamMatch) settings.stream = streamMatch[1] === 'true';
        
        const tempMatch = settingsContent.match(/"temperature"\s*:\s*([0-9.]+)/);
        if (tempMatch) settings.temperature = parseFloat(tempMatch[1]);
        
        const topPMatch = settingsContent.match(/"top_p"\s*:\s*([0-9.]+)/);
        if (topPMatch) settings.top_p = parseFloat(topPMatch[1]);
        
        const maxTokensMatch = settingsContent.match(/"max_tokens"\s*:\s*([0-9]+)/);
        if (maxTokensMatch) settings.max_tokens = parseInt(maxTokensMatch[1], 10);
        
        if (Object.keys(settings).length > 0) {
          result.settings = settings;
        }
      }
    }
  } catch (error) {
    // Failed to extract settings
  }

  return result;
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
 */
export function extractNonJsonContent(text: string): { before: string; after: string } {
  const match = text.match(/([\s\S]*?)```json[\s\S]*?```([\s\S]*)/);
  
  if (match) {
    return {
      before: match[1].trim(),
      after: match[2].trim(),
    };
  }
  
  // No JSON block found, return all as before
  return {
    before: text.trim(),
    after: '',
  };
}

