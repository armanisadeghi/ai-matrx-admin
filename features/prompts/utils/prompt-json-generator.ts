/**
 * Prompt JSON Generator Utilities
 * 
 * Helper functions for AI assistants to generate prompt JSON
 */

import { PromptMessage, PromptVariable, PromptsData  } from '@/features/prompts/types/core';
import { PromptSettings } from '../types/core';

/**
 * Create a prompt JSON object
 */
export function createPromptJSON(
  name: string,
  messages: PromptMessage[],
  options?: {
    id?: string;
    description?: string;
    variableDefaults?: PromptVariable[];
    settings?: PromptSettings;
  }
): PromptsData {
  return {
    id: options?.id,
    name,
    description: options?.description,
    messages,
    variableDefaults: options?.variableDefaults,
    settings: options?.settings
  };
}

/**
 * Create a system message
 */
export function systemMessage(content: string): PromptMessage {
  return { role: 'system', content };
}

/**
 * Create a user message
 */
export function userMessage(content: string): PromptMessage {
  return { role: 'user', content };
}

/**
 * Create an assistant message
 */
export function assistantMessage(content: string): PromptMessage {
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
export function defaultSettings(overrides?: Partial<PromptSettings>): PromptSettings {
  return {
    temperature: 0.7,
    max_tokens: 2000,
    ...overrides
  };
}

/**
 * Format prompt JSON as a string
 */
export function formatPromptJSON(prompt: PromptsData, pretty: boolean = true): string {
  return JSON.stringify(prompt, null, pretty ? 2 : 0);
}

/**
 * Create a batch import JSON
 */
export function createBatchJSON(prompts: PromptsData[], overwriteExisting: boolean = false) {
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
    settings?: PromptSettings;
  }
): PromptsData {
  return createPromptJSON(
    name,
    [systemMessage(systemContent), userMessage(userContent)],
    {
      description: options?.description,
      settings: options?.settings
    }
  );
}

