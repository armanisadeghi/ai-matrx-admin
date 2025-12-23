/**
 * Prompt JSON Generator Utilities
 * 
 * Helper functions for AI assistants to generate prompt JSON
 */

import { PromptMessage, PromptVariable, PromptData } from '@/features/prompts/types/core';
import { PromptSettings } from '../types/core';
import { removeNullSettings } from './settings-filter';

/**
 * Create a prompt JSON object
 * Automatically filters out null/undefined settings values
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
): PromptData {
  // Clean settings to remove null/undefined values
  const cleanedSettings = options?.settings ? removeNullSettings(options.settings) : undefined;
  
  return {
    id: options?.id,
    name,
    description: options?.description,
    messages,
    variableDefaults: options?.variableDefaults,
    settings: cleanedSettings
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
    max_output_tokens: 2000,
    ...overrides
  };
}

/**
 * Format prompt JSON as a string
 * Cleans settings before formatting
 */
export function formatPromptJSON(prompt: PromptData, pretty: boolean = true): string {
  // Clean the prompt settings before formatting
  const cleanedPrompt = {
    ...prompt,
    settings: prompt.settings ? removeNullSettings(prompt.settings) : undefined
  };
  return JSON.stringify(cleanedPrompt, null, pretty ? 2 : 0);
}

/**
 * Create a batch import JSON
 */
export function createBatchJSON(prompts: PromptData[], overwriteExisting: boolean = false) {
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
): PromptData {
  return createPromptJSON(
    name,
    [systemMessage(systemContent), userMessage(userContent)],
    {
      description: options?.description,
      settings: options?.settings
    }
  );
}

