/**
 * Action Executor
 * 
 * Converts Matrx Actions into executable prompt configurations
 * and resolves variables from available context
 */

import { MatrxAction, AvailableContext } from '../types';
import { PromptExecutionConfig, VariableSource } from '@/features/prompts/types/execution';

/**
 * Resolve a single variable from context
 */
export function resolveVariable(
  variableName: string,
  action: MatrxAction,
  context: AvailableContext
): VariableSource {
  const mapping = action.variableContextMap?.[variableName];
  
  if (!mapping) {
    // No mapping defined, return empty hardcoded value
    return { type: 'hardcoded', value: '' };
  }

  // Try primary source
  let value: string | undefined;

  switch (mapping.source) {
    case 'selection':
      value = context.selectedText;
      break;
    case 'editor_content':
      value = context.editorContent;
      break;
    case 'clipboard':
      value = context.clipboard;
      break;
    case 'screenshot':
      value = context.screenshot;
      break;
    case 'page_html':
      value = context.pageHtml;
      break;
    case 'file_content':
      value = context.fileContent;
      break;
    case 'manual_input':
      // For now, use default value
      // In full implementation, this would trigger a modal
      value = mapping.default;
      break;
    case 'custom':
      // Custom context lookup
      value = context[variableName];
      break;
  }

  // Try fallback if primary failed
  if (!value && mapping.fallback) {
    switch (mapping.fallback) {
      case 'selection':
        value = context.selectedText;
        break;
      case 'editor_content':
        value = context.editorContent;
        break;
      case 'clipboard':
        value = context.clipboard;
        break;
      case 'manual_input':
        value = mapping.default;
        break;
    }
  }

  // Use default if still no value
  if (!value && mapping.default) {
    value = mapping.default;
  }

  // Check if required
  if (mapping.required && !value) {
    throw new Error(`Required variable "${variableName}" could not be resolved from context`);
  }

  return {
    type: 'hardcoded',
    value: value || ''
  };
}

/**
 * Convert MatrxAction to PromptExecutionConfig
 */
export function actionToPromptConfig(
  action: MatrxAction,
  context: AvailableContext
): PromptExecutionConfig {
  if (action.actionType !== 'prompt') {
    throw new Error(`Action type "${action.actionType}" is not supported yet. Only "prompt" actions are currently supported.`);
  }

  if (!action.promptId) {
    throw new Error('Action does not have a prompt ID');
  }

  // Resolve all variables
  const variables: Record<string, VariableSource> = {};
  
  if (action.variableContextMap) {
    for (const variableName of Object.keys(action.variableContextMap)) {
      try {
        variables[variableName] = resolveVariable(variableName, action, context);
      } catch (error) {
        console.error(`Failed to resolve variable "${variableName}":`, error);
        throw error;
      }
    }
  }

  // Build execution config
  const config: PromptExecutionConfig = {
    promptId: action.promptId,
    variables,
    output: {
      type: 'canvas',
      options: {
        title: `${action.name} Result`,
        type: 'text'
      }
    },
    context
  };

  return config;
}

/**
 * Validate that an action can be executed with the given context
 */
export function validateActionContext(
  action: MatrxAction,
  context: AvailableContext
): { valid: boolean; error?: string } {
  if (!action.variableContextMap) {
    return { valid: true };
  }

  for (const [variableName, mapping] of Object.entries(action.variableContextMap)) {
    if (!mapping.required) {
      continue;
    }

    // Check if we can resolve this variable
    let hasValue = false;

    // Check primary source
    switch (mapping.source) {
      case 'selection':
        hasValue = !!context.selectedText;
        break;
      case 'editor_content':
        hasValue = !!context.editorContent;
        break;
      case 'manual_input':
        hasValue = true; // Always valid, will prompt user
        break;
      case 'clipboard':
        hasValue = !!context.clipboard;
        break;
      default:
        hasValue = !!mapping.default;
    }

    // Check fallback
    if (!hasValue && mapping.fallback) {
      switch (mapping.fallback) {
        case 'selection':
          hasValue = !!context.selectedText;
          break;
        case 'editor_content':
          hasValue = !!context.editorContent;
          break;
        case 'manual_input':
          hasValue = true;
          break;
      }
    }

    if (!hasValue) {
      return {
        valid: false,
        error: `Required variable "${variableName}" cannot be resolved. ${
          mapping.source === 'selection' ? 'Please select some text.' : ''
        }`
      };
    }
  }

  return { valid: true };
}

