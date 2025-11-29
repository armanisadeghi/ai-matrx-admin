/**
 * Prompt JSON Schema
 * 
 * Defines the structure for creating prompts programmatically via JSON.
 * This allows AI assistants to generate prompts that can be imported.
 */

import { PromptData } from '@/features/prompts/types/core';
/**
 * Batch import format for creating multiple prompts at once
 */
export interface PromptBatchJSON {
  prompts: PromptData[];
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

