/**
 * Prompt JSON Schema
 * 
 * Defines the structure for creating prompts programmatically via JSON.
 * This allows AI assistants to generate prompts that can be imported.
 */

import { PromptVariable } from './variable-components';

export interface PromptMessageJSON {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface PromptSettingsJSON {
  model_id?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  top_k?: number;
  output_format?: string;
  reasoning_effort?: string;
  [key: string]: any; // Allow additional model-specific settings
}

export interface PromptJSON {
  /**
   * Unique identifier for the prompt
   * If not provided, one will be generated
   */
  id?: string;

  /**
   * Display name for the prompt
   */
  name: string;

  /**
   * Optional description explaining what the prompt does
   */
  description?: string;

  /**
   * Array of messages (system, user, assistant)
   * System message should typically be first
   */
  messages: PromptMessageJSON[];

  /**
   * Variables used in the prompt
   * Extracted automatically from {{variable_name}} placeholders
   * You can provide default values here
   */
  variables?: PromptVariable[];

  /**
   * Model settings and configuration
   * If model_id is not specified, the default model will be used
   */
  settings?: PromptSettingsJSON;

  /**
   * Optional metadata about prompt creation
   */
  metadata?: {
    createdBy?: string;
    version?: string;
    tags?: string[];
    [key: string]: any;
  };
}

/**
 * Batch import format for creating multiple prompts at once
 */
export interface PromptBatchJSON {
  prompts: PromptJSON[];
  overwriteExisting?: boolean; // If true, prompts with matching IDs will be updated
}

/**
 * Response from prompt import
 */
export interface PromptImportResult {
  success: boolean;
  promptId: string;
  promptName: string;
  message?: string;
  error?: string;
}

export interface PromptBatchImportResult {
  success: boolean;
  results: PromptImportResult[];
  totalImported: number;
  totalFailed: number;
}

