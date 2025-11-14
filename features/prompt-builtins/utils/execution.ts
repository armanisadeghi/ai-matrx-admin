import { ApplicationScope, ScopeMapping, PromptExecutionData } from '../types';
import { PromptVariable } from '@/features/prompts/types/core';
import { SCOPE_UNAVAILABLE_VALUES } from '../constants';

/**
 * Utilities for executing prompts from shortcuts
 */

// ============================================================================
// Scope Mapping & Variable Resolution
// ============================================================================

/**
 * Maps application scope values to prompt variables using scope_mappings
 * 
 * @param applicationScope - The current application scope (selection, content, context)
 * @param scopeMappings - The mapping configuration from the shortcut
 * @param variableDefaults - Default values for prompt variables
 * @returns Object with all prompt variables populated
 */
export function mapScopeToVariables(
  applicationScope: ApplicationScope,
  scopeMappings: ScopeMapping,
  variableDefaults: PromptVariable[] | null
): Record<string, any> {
  const variables: Record<string, any> = {};

  // Step 1: Apply defaults from variable_defaults
  if (variableDefaults) {
    variableDefaults.forEach(varDef => {
      variables[varDef.name] = varDef.defaultValue;
    });
  }

  // Step 2: Override with scope-mapped values
  if (scopeMappings.selection && applicationScope.selection !== null) {
    variables[scopeMappings.selection] = applicationScope.selection;
  }

  if (scopeMappings.content && applicationScope.content !== null) {
    variables[scopeMappings.content] = applicationScope.content;
  }

  if (scopeMappings.context && applicationScope.context !== null) {
    variables[scopeMappings.context] = applicationScope.context;
  }

  return variables;
}

/**
 * Prepares execution data by combining prompt template with mapped variables
 * This is compatible with usePromptExecution hook
 * 
 * @param executionData - Data from get_prompt_execution_data() function
 * @param applicationScope - Current application scope
 * @returns Prepared data ready for usePromptExecution
 */
export function preparePromptExecution(
  executionData: PromptExecutionData,
  applicationScope: ApplicationScope
): {
  messages: any[];
  variables: Record<string, string>; // Simple format for usePromptExecution
  tools: any[] | null;
  settings: Record<string, any> | null;
  metadata: {
    shortcutId: string;
    shortcutLabel: string;
    promptBuiltinId: string;
    promptName: string;
  };
} {
  // executionData.variableDefaults is already PromptVariable[]
  const variables = mapScopeToVariables(
    applicationScope,
    executionData.scope_mappings,
    executionData.variableDefaults
  );

  return {
    messages: executionData.messages,
    variables,
    tools: executionData.tools,
    settings: executionData.settings,
    metadata: {
      shortcutId: executionData.shortcut_id,
      shortcutLabel: executionData.shortcut_label,
      promptBuiltinId: executionData.prompt_builtin_id,
      promptName: executionData.prompt_name,
    },
  };
}

/**
 * Prepares prompt data for direct use with usePromptExecution hook
 * 
 * @param executionData - Data from get_prompt_execution_data()
 * @param applicationScope - Current application scope
 * @returns Config object ready for execute() call
 */
export function prepareForUsePromptExecution(
  executionData: PromptExecutionData,
  applicationScope: ApplicationScope
): {
  promptData: {
    id: string;
    name: string;
    messages: any[];
    variableDefaults: PromptVariable[] | null;
    settings: Record<string, any> | null;
  };
  variables: Record<string, string>; // Simple format
} {
  const variables = mapScopeToVariables(
    applicationScope,
    executionData.scope_mappings,
    executionData.variableDefaults
  );

  return {
    promptData: {
      id: executionData.prompt_builtin_id,
      name: executionData.prompt_name,
      messages: executionData.messages,
      variableDefaults: executionData.variableDefaults,
      settings: executionData.settings,
    },
    variables,
  };
}

// ============================================================================
// Scope Value Helpers
// ============================================================================

/**
 * Creates an empty/unavailable application scope
 * Useful for buttons and cards that don't have selection
 */
export function createEmptyScope(): ApplicationScope {
  return {
    selection: SCOPE_UNAVAILABLE_VALUES.EMPTY,
    content: SCOPE_UNAVAILABLE_VALUES.EMPTY,
    context: SCOPE_UNAVAILABLE_VALUES.EMPTY,
  };
}

/**
 * Creates an application scope with NOT AVAILABLE markers
 * Useful when we want to explicitly mark unavailable data
 */
export function createUnavailableScope(): ApplicationScope {
  return {
    selection: SCOPE_UNAVAILABLE_VALUES.NOT_AVAILABLE,
    content: SCOPE_UNAVAILABLE_VALUES.NOT_AVAILABLE,
    context: SCOPE_UNAVAILABLE_VALUES.NOT_AVAILABLE,
  };
}

/**
 * Checks if a scope value is considered "empty" or "unavailable"
 */
export function isScopeValueEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (value === SCOPE_UNAVAILABLE_VALUES.EMPTY) return true;
  if (value === SCOPE_UNAVAILABLE_VALUES.NOT_AVAILABLE) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return false;
}

/**
 * Sanitizes a scope value for use in a prompt
 * Converts empty/null to a standardized format
 */
export function sanitizeScopeValue(
  value: any,
  emptyReplacement: string = SCOPE_UNAVAILABLE_VALUES.NOT_AVAILABLE
): string {
  if (isScopeValueEmpty(value)) {
    return emptyReplacement;
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }

  return String(value);
}

// ============================================================================
// Variable Substitution (for message templates)
// ============================================================================

/**
 * Replaces variable placeholders in message content
 * Handles {{variableName}} syntax
 * 
 * @param content - Message content with variable placeholders
 * @param variables - Variable values to substitute
 * @returns Content with variables replaced
 */
export function substituteVariables(
  content: string,
  variables: Record<string, any>
): string {
  let result = content;

  // Replace {{variableName}} with actual values
  Object.entries(variables).forEach(([name, value]) => {
    const placeholder = `{{${name}}}`;
    const sanitizedValue = sanitizeScopeValue(value);
    result = result.replaceAll(placeholder, sanitizedValue);
  });

  return result;
}

/**
 * Processes all messages in a prompt, substituting variables
 * 
 * @param messages - Array of prompt messages
 * @param variables - Variable values to substitute
 * @returns Processed messages with variables replaced
 */
export function processMessagesWithVariables(
  messages: any[],
  variables: Record<string, any>
): any[] {
  return messages.map(message => ({
    ...message,
    content: substituteVariables(message.content, variables),
  }));
}

// ============================================================================
// Debug Helpers
// ============================================================================

/**
 * Gets a summary of what variables are mapped and their sources
 * Useful for debugging and admin UI
 */
export function getScopeMappingSummary(
  scopeMappings: ScopeMapping | null,
  applicationScope: ApplicationScope
): {
  selection: { mapped: boolean; variableName?: string; hasValue: boolean };
  content: { mapped: boolean; variableName?: string; hasValue: boolean };
  context: { mapped: boolean; variableName?: string; hasValue: boolean };
} {
  return {
    selection: {
      mapped: !!scopeMappings?.selection,
      variableName: scopeMappings?.selection,
      hasValue: !isScopeValueEmpty(applicationScope.selection),
    },
    content: {
      mapped: !!scopeMappings?.content,
      variableName: scopeMappings?.content,
      hasValue: !isScopeValueEmpty(applicationScope.content),
    },
    context: {
      mapped: !!scopeMappings?.context,
      variableName: scopeMappings?.context,
      hasValue: !isScopeValueEmpty(applicationScope.context),
    },
  };
}

