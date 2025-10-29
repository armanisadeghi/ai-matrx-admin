/**
 * Variable Resolution Utility
 * 
 * Resolves variables from multiple sources including hardcoded values,
 * functions, user input, Redux state, broker values, and more.
 */

import { VariableSource, VariableSourceMap } from '../types/execution';
import { createClient } from '@/utils/supabase/client';

/**
 * Resolve all variables from their sources
 */
export async function resolveVariables(
  variableNames: string[],
  sourceMap: VariableSourceMap = {},
  context: any = {}
): Promise<{ values: Record<string, string>; errors: Record<string, string> }> {
  const values: Record<string, string> = {};
  const errors: Record<string, string> = {};

  for (const variableName of variableNames) {
    try {
      const source = sourceMap[variableName];
      
      if (!source) {
        // No source provided - use empty string or error?
        values[variableName] = '';
        continue;
      }

      const resolvedValue = await resolveVariable(source, context);
      values[variableName] = resolvedValue;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors[variableName] = errorMessage;
      values[variableName] = ''; // Provide empty string as fallback
    }
  }

  return { values, errors };
}

/**
 * Resolve a single variable from its source
 */
export async function resolveVariable(
  source: VariableSource,
  context: any = {}
): Promise<string> {
  switch (source.type) {
    case 'hardcoded':
      return source.value;

    case 'runtime':
      return await Promise.resolve(source.getValue());

    case 'function':
      return await Promise.resolve(source.fn(context));

    case 'user-input':
      // In programmatic execution, user input should already be provided
      // This would typically be handled by the execution layer
      return context.userInput || source.default || '';

    case 'context':
      return getNestedValue(context, source.path) ?? '';

    case 'previous-result':
      return getNestedValue(context.previousResult, source.resultPath) ?? '';

    case 'redux':
      // Access Redux state - this assumes context has access to store
      if (context.reduxState) {
        return source.selector(context.reduxState) ?? '';
      }
      throw new Error('Redux state not available in context');

    case 'broker':
      // Access broker value from context
      if (context.brokerValues && source.brokerId in context.brokerValues) {
        return String(context.brokerValues[source.brokerId]);
      }
      throw new Error(`Broker value not found: ${source.brokerId}`);

    default:
      throw new Error(`Unknown variable source type: ${(source as any).type}`);
  }
}

/**
 * Replace variables in a text string
 */
export function replaceVariablesInText(
  text: string,
  values: Record<string, string>
): string {
  let result = text;
  
  Object.entries(values).forEach(([key, value]) => {
    // Replace {{variable}} or {{ variable }} (with optional whitespace)
    const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    result = result.replace(regex, value);
  });
  
  return result;
}

/**
 * Extract variable names from text
 */
export function extractVariables(text: string): string[] {
  const variableRegex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
  const variables = new Set<string>();
  
  let match;
  while ((match = variableRegex.exec(text)) !== null) {
    variables.add(match[1]);
  }
  
  return Array.from(variables);
}

/**
 * Extract all variables from prompt messages
 */
export function extractVariablesFromMessages(messages: any[]): string[] {
  const allVariables = new Set<string>();
  
  messages.forEach(message => {
    const content = typeof message.content === 'string' 
      ? message.content 
      : JSON.stringify(message.content);
    
    const vars = extractVariables(content);
    vars.forEach(v => allVariables.add(v));
  });
  
  return Array.from(allVariables);
}

/**
 * Get nested value from object using dot notation path
 */
function getNestedValue(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }
  
  return current;
}

/**
 * Validate that all required variables have sources
 */
export function validateVariableSources(
  variableNames: string[],
  sourceMap: VariableSourceMap
): { valid: boolean; missing: string[] } {
  const missing = variableNames.filter(name => !(name in sourceMap));
  
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Create a simple hardcoded variable source map
 */
export function createHardcodedMap(values: Record<string, string>): VariableSourceMap {
  const map: VariableSourceMap = {};
  
  Object.entries(values).forEach(([key, value]) => {
    map[key] = { type: 'hardcoded', value };
  });
  
  return map;
}

/**
 * Merge multiple variable source maps
 */
export function mergeVariableSources(...maps: VariableSourceMap[]): VariableSourceMap {
  return Object.assign({}, ...maps);
}

