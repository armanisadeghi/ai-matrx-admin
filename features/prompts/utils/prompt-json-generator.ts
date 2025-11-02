/**
 * Prompt JSON Generator Utilities
 * 
 * Helper functions for AI assistants to generate prompt JSON
 */

import type { PromptJSON, PromptMessageJSON, PromptSettingsJSON } from '../types/prompt-json';
import { PromptVariable } from '../types/variable-components';

/**
 * Create a prompt JSON object
 */
export function createPromptJSON(
  name: string,
  messages: PromptMessageJSON[],
  options?: {
    id?: string;
    description?: string;
    variables?: PromptVariable[];
    settings?: PromptSettingsJSON;
  }
): PromptJSON {
  return {
    id: options?.id,
    name,
    description: options?.description,
    messages,
    variables: options?.variables,
    settings: options?.settings
  };
}

/**
 * Create a system message
 */
export function systemMessage(content: string): PromptMessageJSON {
  return { role: 'system', content };
}

/**
 * Create a user message
 */
export function userMessage(content: string): PromptMessageJSON {
  return { role: 'user', content };
}

/**
 * Create an assistant message
 */
export function assistantMessage(content: string): PromptMessageJSON {
  return { role: 'assistant', content };
}

/**
 * Create a variable definition
 */
export function variable(name: string, defaultValue: string = ''): PromptVariable {
  return { name, defaultValue };
}

/**
 * Create default settings
 */
export function defaultSettings(overrides?: Partial<PromptSettingsJSON>): PromptSettingsJSON {
  return {
    temperature: 0.7,
    max_tokens: 2000,
    ...overrides
  };
}

/**
 * Format prompt JSON as a string
 */
export function formatPromptJSON(prompt: PromptJSON, pretty: boolean = true): string {
  return JSON.stringify(prompt, null, pretty ? 2 : 0);
}

/**
 * Create a batch import JSON
 */
export function createBatchJSON(prompts: PromptJSON[], overwriteExisting: boolean = false) {
  return {
    prompts,
    overwriteExisting
  };
}

/**
 * Quick builder for simple single-message prompts
 */
export function quickPrompt(
  name: string,
  systemContent: string,
  userContent: string,
  options?: {
    description?: string;
    settings?: PromptSettingsJSON;
  }
): PromptJSON {
  return createPromptJSON(
    name,
    [systemMessage(systemContent), userMessage(userContent)],
    {
      description: options?.description,
      settings: options?.settings
    }
  );
}

