/**
 * Prompt Import Service
 * 
 * Handles importing prompts from JSON format into the database
 */

import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@/utils/supabase/client';
import type { PromptJSON, PromptImportResult, PromptBatchJSON, PromptBatchImportResult } from '../types/prompt-json';

/**
 * Extract variable names from messages
 * Also normalizes variable syntax by removing spaces
 */
function extractVariablesFromMessages(messages: any[]): string[] {
  const variablePattern = /\{\{\s*([^}]+?)\s*\}\}/g;
  const variables = new Set<string>();

  messages.forEach(msg => {
    const matches = msg.content.matchAll(variablePattern);
    for (const match of matches) {
      variables.add(match[1].trim());
    }
  });

  return Array.from(variables);
}

/**
 * Normalize variable syntax in message content
 * Converts {{ variable }} to {{variable}}
 */
function normalizeVariableSyntax(content: string): string {
  return content.replace(/\{\{\s*([^}]+?)\s*\}\}/g, '{{$1}}');
}

/**
 * Validate prompt JSON
 */
function validatePromptJSON(prompt: PromptJSON): { valid: boolean; error?: string } {
  if (!prompt.name || prompt.name.trim() === '') {
    return { valid: false, error: 'Prompt name is required' };
  }

  if (!prompt.messages || prompt.messages.length === 0) {
    return { valid: false, error: 'At least one message is required' };
  }

  // Validate message structure
  for (const msg of prompt.messages) {
    if (!msg.role || !['system', 'user', 'assistant'].includes(msg.role)) {
      return { valid: false, error: `Invalid message role: ${msg.role}` };
    }
    if (typeof msg.content !== 'string') {
      return { valid: false, error: 'Message content must be a string' };
    }
  }

  return { valid: true };
}

/**
 * Import a single prompt from JSON
 */
export async function importPrompt(promptJSON: PromptJSON): Promise<PromptImportResult> {
  try {
    // Validate input
    const validation = validatePromptJSON(promptJSON);
    if (!validation.valid) {
      return {
        success: false,
        promptId: '',
        promptName: promptJSON.name,
        error: validation.error
      };
    }

    const supabase = createClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        success: false,
        promptId: '',
        promptName: promptJSON.name,
        error: 'User not authenticated'
      };
    }

    // Generate ID if not provided
    const promptId = promptJSON.id || uuidv4();

    // Normalize variable syntax in all messages (remove spaces from {{ var }})
    const normalizedMessages = promptJSON.messages.map(msg => ({
      ...msg,
      content: normalizeVariableSyntax(msg.content)
    }));

    // Extract variables from normalized messages
    const extractedVariables = extractVariablesFromMessages(normalizedMessages);
    
    // Build variable defaults array
    const variableDefaults = extractedVariables.map(varName => {
      const provided = promptJSON.variables?.find(v => v.name === varName);
      return {
        name: varName,
        defaultValue: provided?.defaultValue || ''
      };
    });

    // Prepare prompt data for database
    const promptData = {
      id: promptId,
      user_id: user.id,
      name: promptJSON.name,
      description: promptJSON.description || null,
      messages: normalizedMessages, // Use normalized messages
      variable_defaults: variableDefaults,
      settings: promptJSON.settings || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Check if prompt with this ID already exists
    const { data: existing } = await supabase
      .from('prompts')
      .select('id')
      .eq('id', promptId)
      .single();

    if (existing) {
      // Update existing prompt
      const { error } = await supabase
        .from('prompts')
        .update(promptData)
        .eq('id', promptId);

      if (error) throw error;

      return {
        success: true,
        promptId,
        promptName: promptJSON.name,
        message: 'Prompt updated successfully'
      };
    } else {
      // Insert new prompt
      const { error } = await supabase
        .from('prompts')
        .insert(promptData);

      if (error) throw error;

      return {
        success: true,
        promptId,
        promptName: promptJSON.name,
        message: 'Prompt created successfully'
      };
    }

  } catch (error) {
    console.error('Error importing prompt:', error);
    return {
      success: false,
      promptId: promptJSON.id || '',
      promptName: promptJSON.name,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Import multiple prompts from batch JSON
 */
export async function importPromptBatch(batchJSON: PromptBatchJSON): Promise<PromptBatchImportResult> {
  const results: PromptImportResult[] = [];
  
  for (const promptJSON of batchJSON.prompts) {
    const result = await importPrompt(promptJSON);
    results.push(result);
  }

  const totalImported = results.filter(r => r.success).length;
  const totalFailed = results.filter(r => !r.success).length;

  return {
    success: totalFailed === 0,
    results,
    totalImported,
    totalFailed
  };
}

/**
 * Export a prompt as JSON
 */
export async function exportPromptAsJSON(promptId: string): Promise<PromptJSON | null> {
  try {
    const supabase = createClient();
    
    const { data: prompt, error } = await supabase
      .from('prompts')
      .select('*')
      .eq('id', promptId)
      .single();

    if (error || !prompt) {
      console.error('Error fetching prompt:', error);
      return null;
    }

    return {
      id: prompt.id,
      name: prompt.name,
      description: prompt.description,
      messages: prompt.messages,
      variables: prompt.variable_defaults,
      settings: prompt.settings
    };

  } catch (error) {
    console.error('Error exporting prompt:', error);
    return null;
  }
}

