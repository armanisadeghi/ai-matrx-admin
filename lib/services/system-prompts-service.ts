/**
 * System Prompts Service
 * 
 * Handles all database operations for system prompts.
 * Similar to content-blocks-service.ts pattern.
 */

import { getBrowserSupabaseClient } from '@/utils/supabase/getBrowserClient';
import type {
  SystemPromptDB,
  SystemPromptQueryOptions,
  CreateSystemPromptInput,
  UpdateSystemPromptInput,
  PublishSystemPromptUpdateInput,
  SystemPromptWithStats
} from '@/types/system-prompts-db';

/**
 * Fetch all system prompts with optional filtering (NEW SCHEMA)
 */
export async function fetchSystemPrompts(options: SystemPromptQueryOptions = {}) {
  const supabase = getBrowserSupabaseClient();
  
  let query = supabase
    .from('system_prompts_new')
    .select(`
      *,
      category:system_prompt_categories_new!category_id (
        id,
        category_id,
        placement_type,
        parent_category_id,
        label,
        description,
        icon_name,
        color,
        sort_order,
        is_active
      )
    `);
  
  // Apply filters
  if (options.category_id) {
    query = query.eq('category_id', options.category_id);
  }
  
  if (options.status) {
    query = query.eq('status', options.status);
  }
  
  if (options.is_active !== undefined) {
    query = query.eq('is_active', options.is_active);
  }
  
  if (options.tags && options.tags.length > 0) {
    query = query.contains('tags', options.tags);
  }
  
  if (options.search) {
    query = query.or(`label.ilike.%${options.search}%,description.ilike.%${options.search}%,prompt_id.ilike.%${options.search}%`);
  }
  
  // Order by category sort_order, then prompt sort_order, then label
  query = query.order('sort_order', { ascending: true });
  query = query.order('label', { ascending: true });
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching system prompts:', error);
    throw error;
  }
  
  // Filter by placement_type if specified (done client-side since it's in joined table)
  let results = data as SystemPromptDB[];
  if (options.placement_type && results) {
    results = results.filter(p => p.category?.placement_type === options.placement_type);
  }
  
  return results;
}

/**
 * Fetch a single system prompt by ID (NEW SCHEMA)
 */
export async function fetchSystemPromptById(id: string) {
  const supabase = getBrowserSupabaseClient();
  
  const { data, error } = await supabase
    .from('system_prompts_new')
    .select(`
      *,
      category:system_prompt_categories_new!category_id (
        id,
        category_id,
        placement_type,
        parent_category_id,
        label,
        description,
        icon_name,
        color,
        sort_order,
        is_active
      )
    `)
    .eq('id', id)
    .single();
  
  if (error) {
    console.error('Error fetching system prompt:', error);
    throw error;
  }
  
  return data as SystemPromptDB;
}

/**
 * Fetch a single system prompt by prompt_id (NEW SCHEMA)
 */
export async function fetchSystemPromptByPromptId(promptId: string) {
  const supabase = getBrowserSupabaseClient();
  
  const { data, error } = await supabase
    .from('system_prompts_new')
    .select(`
      *,
      category:system_prompt_categories_new!category_id (
        id,
        category_id,
        placement_type,
        parent_category_id,
        label,
        description,
        icon_name,
        color,
        sort_order,
        is_active
      )
    `)
    .eq('prompt_id', promptId)
    .single();
  
  if (error) {
    console.error('Error fetching system prompt:', error);
    throw error;
  }
  
  return data as SystemPromptDB;
}

/**
 * Fetch system prompts for context menu (NEW SCHEMA)
 */
export async function fetchContextMenuPrompts() {
  return await fetchSystemPrompts({
    placement_type: 'context-menu',
    is_active: true,
    status: 'published'
  });
}

/**
 * Fetch system prompts for cards (NEW SCHEMA)
 */
export async function fetchCardPrompts() {
  return await fetchSystemPrompts({
    placement_type: 'card',
    is_active: true,
    status: 'published'
  });
}

/**
 * Fetch system prompts for buttons (NEW SCHEMA)
 */
export async function fetchButtonPrompts() {
  return await fetchSystemPrompts({
    placement_type: 'button',
    is_active: true,
    status: 'published'
  });
}

/**
 * Create a new system prompt (NEW SCHEMA)
 */
export async function createSystemPrompt(input: CreateSystemPromptInput) {
  const supabase = getBrowserSupabaseClient();
  
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) {
    throw new Error('User not authenticated');
  }
  
  const { data, error } = await supabase
    .from('system_prompts_new')
    .insert({
      prompt_id: input.prompt_id,
      category_id: input.category_id,
      label: input.label,
      description: input.description || null,
      icon_name: input.icon_name,
      prompt_snapshot: input.prompt_snapshot,
      source_prompt_id: input.source_prompt_id || null,
      tags: input.tags || [],
      sort_order: input.sort_order || 0,
      is_active: input.is_active !== undefined ? input.is_active : true,
      is_featured: input.is_featured || false,
      status: input.status || 'published',
      metadata: input.metadata || {},
      published_by: user.user.id
    })
    .select(`
      *,
      category:system_prompt_categories_new!category_id (
        id,
        category_id,
        placement_type,
        parent_category_id,
        label,
        description,
        icon_name,
        color,
        sort_order,
        is_active
      )
    `)
    .single();
  
  if (error) {
    console.error('Error creating system prompt:', error);
    throw error;
  }
  
  return data as SystemPromptDB;
}

/**
 * Update an existing system prompt (NEW SCHEMA)
 */
export async function updateSystemPrompt(id: string, input: UpdateSystemPromptInput) {
  const supabase = getBrowserSupabaseClient();
  
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) {
    throw new Error('User not authenticated');
  }
  
  // Build update object (only include defined fields)
  const updateData: any = {
    last_updated_by: user.user.id,
    last_updated_at: new Date().toISOString()
  };
  
  if (input.prompt_id !== undefined) updateData.prompt_id = input.prompt_id;
  if (input.category_id !== undefined) updateData.category_id = input.category_id;
  if (input.label !== undefined) updateData.label = input.label;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.icon_name !== undefined) updateData.icon_name = input.icon_name;
  if (input.tags !== undefined) updateData.tags = input.tags;
  if (input.sort_order !== undefined) updateData.sort_order = input.sort_order;
  if (input.is_active !== undefined) updateData.is_active = input.is_active;
  if (input.is_featured !== undefined) updateData.is_featured = input.is_featured;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.update_notes !== undefined) updateData.update_notes = input.update_notes;
  if (input.metadata !== undefined) updateData.metadata = input.metadata;
  
  const { data, error } = await supabase
    .from('system_prompts_new')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      category:system_prompt_categories_new!category_id (
        id,
        category_id,
        placement_type,
        parent_category_id,
        label,
        description,
        icon_name,
        color,
        sort_order,
        is_active
      )
    `)
    .single();
  
  if (error) {
    console.error('Error updating system prompt:', error);
    throw error;
  }
  
  return data as SystemPromptDB;
}

/**
 * Publish an update to a system prompt (updates prompt_snapshot) (NEW SCHEMA)
 */
export async function publishSystemPromptUpdate(
  id: string, 
  input: PublishSystemPromptUpdateInput
) {
  const supabase = getBrowserSupabaseClient();
  
  const { data: user } = await supabase.auth.getUser();
  if (!user?.user) {
    throw new Error('User not authenticated');
  }
  
  const { data, error } = await supabase
    .from('system_prompts_new')
    .update({
      prompt_snapshot: input.prompt_snapshot,
      update_notes: input.update_notes,
      last_updated_by: user.user.id,
      last_updated_at: new Date().toISOString()
      // version will be auto-incremented by trigger
    })
    .eq('id', id)
    .select(`
      *,
      category:system_prompt_categories_new!category_id (
        id,
        category_id,
        placement_type,
        parent_category_id,
        label,
        description,
        icon_name,
        color,
        sort_order,
        is_active
      )
    `)
    .single();
  
  if (error) {
    console.error('Error publishing system prompt update:', error);
    throw error;
  }
  
  return data as SystemPromptDB;
}

/**
 * Delete a system prompt (NEW SCHEMA)
 */
export async function deleteSystemPrompt(id: string) {
  const supabase = getBrowserSupabaseClient();
  
  const { error } = await supabase
    .from('system_prompts_new')
    .delete()
    .eq('id', id);
  
  if (error) {
    console.error('Error deleting system prompt:', error);
    throw error;
  }
  
  return true;
}

/**
 * Track a system prompt execution
 */
export async function trackSystemPromptExecution(
  systemPromptId: string,
  triggerType: 'context-menu' | 'card' | 'button' | 'api' | 'other',
  variablesUsed: Record<string, any> = {},
  success: boolean = true,
  errorMessage?: string,
  executionTimeMs?: number
) {
  const supabase = getBrowserSupabaseClient();
  
  const { data: user } = await supabase.auth.getUser();
  
  const { error } = await supabase
    .from('system_prompt_executions')
    .insert({
      system_prompt_id: systemPromptId,
      user_id: user?.user?.id || null,
      trigger_type: triggerType,
      variables_used: variablesUsed,
      success,
      error_message: errorMessage || null,
      execution_time_ms: executionTimeMs || null,
      metadata: {}
    });
  
  if (error) {
    console.error('Error tracking system prompt execution:', error);
    // Don't throw - tracking failures shouldn't break execution
  }
}

/**
 * Get system prompt categories (NEW SCHEMA)
 * Note: Use useSystemPromptCategories hook instead for most cases
 */
export async function getSystemPromptCategories() {
  const supabase = getBrowserSupabaseClient();
  
  const { data, error } = await supabase
    .from('system_prompt_categories_new')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  
  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get system prompt statistics
 */
export async function getSystemPromptStats(id: string) {
  const supabase = getBrowserSupabaseClient();
  
  const { data, error } = await supabase
    .from('system_prompt_executions')
    .select('success, execution_time_ms, created_at')
    .eq('system_prompt_id', id);
  
  if (error) {
    console.error('Error fetching stats:', error);
    return null;
  }
  
  const successCount = data.filter(e => e.success).length;
  const totalCount = data.length;
  const avgTime = data.length > 0
    ? data.reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) / data.length
    : 0;
  
  return {
    totalExecutions: totalCount,
    successfulExecutions: successCount,
    failedExecutions: totalCount - successCount,
    successRate: totalCount > 0 ? (successCount / totalCount) * 100 : 0,
    averageExecutionTime: Math.round(avgTime)
  };
}

